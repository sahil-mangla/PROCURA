package com.procura.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.ai.AiAnalysisEntity;
import com.procura.ai.AiAnalysisRepository;
import com.procura.ai.client.AiRecommendationClient;
import com.procura.ai.dto.AiAnalysisDto;
import com.procura.ai.dto.InternalAiExportDtos;
import com.procura.audit.dto.AiDecisionAuditDto;
import com.procura.common.dto.PagedResponse;
import com.procura.common.enums.HumanDecision;
import com.procura.common.enums.RequestStatus;
import com.procura.procurement.PurchaseRequest;
import com.procura.procurement.PurchaseRequestRepository;
import com.procura.review.HumanReview;
import com.procura.review.HumanReviewRepository;
import com.procura.user.dto.UserRefDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AiAuditAndExportService {

    private final AiAnalysisRepository aiAnalysisRepository;
    private final HumanReviewRepository humanReviewRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final AiRecommendationClient aiRecommendationClient;
    private final ObjectMapper objectMapper;

    public AiAuditAndExportService(
            AiAnalysisRepository aiAnalysisRepository,
            HumanReviewRepository humanReviewRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            ApprovalHistoryRepository approvalHistoryRepository,
            AiRecommendationClient aiRecommendationClient,
            ObjectMapper objectMapper) {
        this.aiAnalysisRepository = aiAnalysisRepository;
        this.humanReviewRepository = humanReviewRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.approvalHistoryRepository = approvalHistoryRepository;
        this.aiRecommendationClient = aiRecommendationClient;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PagedResponse<AiDecisionAuditDto> listAiDecisionAudits(
            Boolean overrideFilter,
            String modelVersion,
            OffsetDateTime from,
            OffsetDateTime to,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AiAnalysisEntity> analysisPage = aiAnalysisRepository.findAudits(modelVersion, from, to, pageable);

        List<AiDecisionAuditDto> items = new ArrayList<>();
        for (AiAnalysisEntity entity : analysisPage.getContent()) {
            AiAnalysisDto analysisDto = AiAnalysisDto.fromEntity(entity, objectMapper);

            // Join with final decision
            Optional<HumanReview> reviewOpt = humanReviewRepository.findFirstByRequestIdOrderByCreatedAtDesc(entity.getRequestId());
            HumanDecision decision = reviewOpt.map(HumanReview::getDecision).orElse(null);
            UserRefDto decidedBy = reviewOpt.map(r -> UserRefDto.fromEntity(r.getDecidedBy())).orElse(null);
            OffsetDateTime decidedAt = reviewOpt.map(HumanReview::getDecidedAt).orElse(null);
            Boolean override = reviewOpt.map(HumanReview::getOverride).orElse(null);
            String overrideReason = reviewOpt.map(HumanReview::getComment).orElse(null);

            if (overrideFilter != null && !overrideFilter.equals(override)) {
                continue;
            }

            items.add(new AiDecisionAuditDto(
                    entity.getRequestId(),
                    analysisDto,
                    decision,
                    decidedBy,
                    decidedAt,
                    override,
                    overrideReason
            ));
        }

        return PagedResponse.of(page, size, analysisPage.getTotalElements(), items);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getModelVersions() {
        return aiRecommendationClient.getModelVersions();
    }

    @Transactional(readOnly = true)
    public InternalAiExportDtos.HistoricalRequestExportResponse exportHistoricalRequests(
            OffsetDateTime updatedSince,
            String cursor,
            int limit
    ) {
        int fetchSize = Math.min(Math.max(limit, 1), 2000);
        Pageable pageable = PageRequest.of(0, fetchSize + 1);

        List<RequestStatus> terminal = List.of(RequestStatus.PO_GENERATED, RequestStatus.REJECTED);
        List<PurchaseRequest> list = purchaseRequestRepository.findHistoricalExport(terminal, updatedSince, cursor, pageable);

        boolean hasMore = list.size() > fetchSize;
        List<PurchaseRequest> resultItems = hasMore ? list.subList(0, fetchSize) : list;
        String nextCursor = hasMore ? resultItems.get(resultItems.size() - 1).getId() : null;

        List<InternalAiExportDtos.HistoricalRequestDto> dtos = resultItems.stream().map(req -> {
            String outcome = req.getStatus() == RequestStatus.PO_GENERATED ? "APPROVED" : "REJECTED";
            return new InternalAiExportDtos.HistoricalRequestDto(
                    req.getId(),
                    req.getTitle(),
                    req.getDescription(),
                    req.getDepartment().getId(),
                    req.getCategory(),
                    req.getPriority(),
                    req.getAmount(),
                    req.getCurrency(),
                    req.getVendor().getId(),
                    req.getItems().size(),
                    req.getSubmittedAt(),
                    req.getBudgetTotalAtSubmit(),
                    req.getBudgetRemainingAtSubmit(),
                    outcome,
                    req.getRejectedAtStage(),
                    req.getUpdatedAt()
            );
        }).toList();

        return new InternalAiExportDtos.HistoricalRequestExportResponse(nextCursor, dtos);
    }

    @Transactional(readOnly = true)
    public InternalAiExportDtos.OutcomeExportResponse exportOutcomes(
            OffsetDateTime since,
            String cursor,
            int limit
    ) {
        int fetchSize = Math.min(Math.max(limit, 1), 2000);
        Pageable pageable = PageRequest.of(0, fetchSize + 1);

        List<RequestStatus> terminal = List.of(RequestStatus.PO_GENERATED, RequestStatus.REJECTED);
        List<PurchaseRequest> list = purchaseRequestRepository.findHistoricalExport(terminal, since, cursor, pageable);

        boolean hasMore = list.size() > fetchSize;
        List<PurchaseRequest> resultItems = hasMore ? list.subList(0, fetchSize) : list;
        String nextCursor = hasMore ? resultItems.get(resultItems.size() - 1).getId() : null;

        List<InternalAiExportDtos.OutcomeDto> dtos = new ArrayList<>();
        for (PurchaseRequest req : resultItems) {
            AiAnalysisEntity analysis = null;
            if (req.getLatestAnalysisId() != null) {
                analysis = aiAnalysisRepository.findById(req.getLatestAnalysisId()).orElse(null);
            }
            if (analysis == null) {
                continue;
            }

            Optional<HumanReview> reviewOpt = humanReviewRepository.findFirstByRequestIdOrderByCreatedAtDesc(req.getId());
            boolean override = reviewOpt.map(r -> Boolean.TRUE.equals(r.getOverride())).orElse(false);
            String overrideReason = reviewOpt.map(HumanReview::getComment).orElse(null);
            OffsetDateTime decidedAt = reviewOpt.map(HumanReview::getDecidedAt).orElse(req.getUpdatedAt());
            String finalOutcome = req.getStatus() == RequestStatus.PO_GENERATED ? "APPROVED" : "REJECTED";

            dtos.add(new InternalAiExportDtos.OutcomeDto(
                    req.getId(),
                    analysis.getId(),
                    analysis.getModelVersion(),
                    analysis.getRecommendation(),
                    analysis.getConfidence(),
                    finalOutcome,
                    override,
                    overrideReason,
                    decidedAt
            ));
        }

        return new InternalAiExportDtos.OutcomeExportResponse(nextCursor, dtos);
    }
}

