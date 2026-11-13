package com.procura.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.ai.client.AiClientModels;
import com.procura.ai.client.AiRecommendationClient;
import com.procura.ai.dto.EvidenceDto;
import com.procura.audit.ApprovalHistory;
import com.procura.audit.ApprovalHistoryRepository;
import com.procura.budget.Budget;
import com.procura.budget.BudgetRepository;
import com.procura.common.enums.ActorType;
import com.procura.common.enums.AiStatus;
import com.procura.common.enums.HistoryEvent;
import com.procura.notification.NotificationService;
import com.procura.procurement.PurchaseRequest;
import com.procura.procurement.PurchaseRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AiAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AiAnalysisService.class);

    private final AiRecommendationClient aiClient;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final BudgetRepository budgetRepository;
    private final ApprovalHistoryRepository historyRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public AiAnalysisService(
            AiRecommendationClient aiClient,
            AiAnalysisRepository aiAnalysisRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            BudgetRepository budgetRepository,
            ApprovalHistoryRepository historyRepository,
            NotificationService notificationService,
            ObjectMapper objectMapper) {
        this.aiClient = aiClient;
        this.aiAnalysisRepository = aiAnalysisRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.budgetRepository = budgetRepository;
        this.historyRepository = historyRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Async
    @Transactional
    public void processRequestAnalysisAsync(String requestId, OffsetDateTime expectedSubmittedAt) {
        log.info("Processing asynchronous AI analysis for request {}", requestId);

        PurchaseRequest request = purchaseRequestRepository.findById(requestId).orElse(null);
        if (request == null) {
            log.error("Request {} not found for AI analysis", requestId);
            return;
        }

        // Concurrency check: Ensure request submission timestamp hasn't been superseded
        if (expectedSubmittedAt != null && request.getSubmittedAt() != null
                && !request.getSubmittedAt().isEqual(expectedSubmittedAt)) {
            log.warn("Ignoring stale AI analysis for request {}: current submittedAt ({}) differs from expected ({})",
                    requestId, request.getSubmittedAt(), expectedSubmittedAt);
            return;
        }

        // Build input payload
        Budget budget = budgetRepository.findByDepartmentIdAndFiscalYear(request.getDepartment().getId(), "2026-27").orElse(null);
        var itemInputs = request.getItems().stream()
                .map(it -> new AiClientModels.AnalysisInput.ItemInput(it.getDescription(), it.getQuantity(), it.getUnitPrice()))
                .toList();

        AiClientModels.AnalysisInput input = new AiClientModels.AnalysisInput(
                request.getId(),
                request.getDepartment().getId(),
                request.getAmount(),
                request.getCurrency(),
                request.getCategory(),
                request.getPriority(),
                request.getVendor().getId(),
                budget != null ? budget.getTotal() : request.getAmount(),
                budget != null ? budget.getRemaining() : request.getAmount(),
                request.getTitle(),
                request.getDescription(),
                request.getSubmittedAt() != null ? request.getSubmittedAt() : OffsetDateTime.now(),
                itemInputs
        );

        try {
            AiClientModels.RecommendationResponse response = aiClient.analyze(input);

            // Validate evidence IDs per D7: check existence in database
            boolean evidenceRejected = false;
            List<EvidenceDto> validEvidence = new ArrayList<>();
            for (EvidenceDto ev : response.evidence()) {
                if (ev.requestId() != null && purchaseRequestRepository.existsById(ev.requestId())) {
                    validEvidence.add(ev);
                } else {
                    log.warn("Dropping unknown evidence requestId {} for analysis of {}", ev.requestId(), requestId);
                    evidenceRejected = true;
                }
            }

            // Save immutable AiAnalysis record
            AiAnalysisEntity analysis = new AiAnalysisEntity();
            analysis.setRequestId(requestId);
            analysis.setRecommendation(response.recommendation());
            analysis.setConfidence(response.confidence());
            analysis.setRiskLevel(response.riskLevel());
            analysis.setRequiresHumanReview(response.requiresHumanReview());
            analysis.setReviewThreshold(response.reviewThreshold());
            analysis.setReasonsJson(objectMapper.writeValueAsString(response.reasons()));
            analysis.setReviewTriggersJson(objectMapper.writeValueAsString(response.reviewTriggers()));
            analysis.setEvidenceJson(objectMapper.writeValueAsString(validEvidence));
            analysis.setModelVersion(response.modelVersion());
            analysis.setAgentVersionsJson(objectMapper.writeValueAsString(response.agentVersions()));
            analysis.setAnalysedAt(response.analysedAt() != null ? response.analysedAt() : OffsetDateTime.now());
            analysis.setEvidenceRejected(evidenceRejected);

            AiAnalysisEntity savedAnalysis = aiAnalysisRepository.save(analysis);

            // Re-fetch request to check state
            request = purchaseRequestRepository.findById(requestId).orElse(null);
            if (request != null && (expectedSubmittedAt == null || request.getSubmittedAt().isEqual(expectedSubmittedAt))) {
                request.setAiStatus(AiStatus.COMPLETED);
                request.setLatestAnalysisId(savedAnalysis.getId());
                purchaseRequestRepository.save(request);

                // Add approval history entry
                ApprovalHistory history = new ApprovalHistory();
                history.setRequestId(requestId);
                history.setEvent(HistoryEvent.AI_ANALYSIS_COMPLETED);
                history.setActorType(ActorType.AI);
                history.setModelVersion(savedAnalysis.getModelVersion());
                history.setAnalysisId(savedAnalysis.getId());
                history.setFromStatus(request.getStatus());
                history.setToStatus(request.getStatus());
                history.setAiRecommendation(savedAnalysis.getRecommendation());
                history.setOverride(false);
                historyRepository.save(history);

                // Notify requester
                notificationService.notifyUser(
                        request.getRequester(),
                        HistoryEvent.AI_ANALYSIS_COMPLETED,
                        requestId,
                        "AI recommendation ready for " + requestId + ": " + savedAnalysis.getRecommendation(),
                        false,
                        savedAnalysis.getRecommendation(),
                        null
                );
            }

        } catch (Exception e) {
            log.error("AI analysis failed for request {}: {}", requestId, e.getMessage(), e);

            request = purchaseRequestRepository.findById(requestId).orElse(null);
            if (request != null) {
                request.setAiStatus(AiStatus.UNAVAILABLE);
                purchaseRequestRepository.save(request);

                ApprovalHistory history = new ApprovalHistory();
                history.setRequestId(requestId);
                history.setEvent(HistoryEvent.AI_UNAVAILABLE);
                history.setActorType(ActorType.SYSTEM);
                history.setFromStatus(request.getStatus());
                history.setToStatus(request.getStatus());
                history.setComment("AI service unavailable: " + e.getMessage());
                historyRepository.save(history);

                // Notify requester and department heads per D12
                notificationService.notifyUser(
                        request.getRequester(),
                        HistoryEvent.AI_UNAVAILABLE,
                        requestId,
                        "AI service was unavailable for " + requestId + ". Proceeding with human workflow.",
                        false,
                        null,
                        null
                );
                notificationService.notifyDepartmentHeads(
                        request.getDepartment().getId(),
                        HistoryEvent.AI_UNAVAILABLE,
                        requestId,
                        "AI service was unavailable for " + requestId + ". Manual review required.",
                        false,
                        null,
                        null
                );
            }
        }
    }
}

