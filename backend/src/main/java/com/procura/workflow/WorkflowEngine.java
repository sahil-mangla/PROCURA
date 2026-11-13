package com.procura.workflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.ai.AiAnalysisEntity;
import com.procura.ai.AiAnalysisRepository;
import com.procura.ai.AiAnalysisService;
import com.procura.ai.dto.ReviewTriggerDto;
import com.procura.audit.ApprovalHistory;
import com.procura.audit.ApprovalHistoryRepository;
import com.procura.budget.Budget;
import com.procura.budget.BudgetRepository;
import com.procura.budget.BudgetService;
import com.procura.common.enums.*;
import com.procura.common.error.Exceptions;
import com.procura.notification.NotificationService;
import com.procura.outbox.OutboxService;
import com.procura.procurement.PurchaseRequest;
import com.procura.procurement.PurchaseRequestRepository;
import com.procura.purchaseorder.PurchaseOrderService;
import com.procura.review.HumanReview;
import com.procura.review.HumanReviewRepository;
import com.procura.security.UserPrincipal;
import com.procura.user.AppUser;
import com.procura.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class WorkflowEngine {

    private static final Logger log = LoggerFactory.getLogger(WorkflowEngine.class);

    private final PurchaseRequestRepository requestRepository;
    private final ApprovalHistoryRepository historyRepository;
    private final HumanReviewRepository reviewRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final BudgetRepository budgetRepository;
    private final BudgetService budgetService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final OutboxService outboxService;
    private final AiAnalysisService aiAnalysisService;
    private final PurchaseOrderService purchaseOrderService;
    private final ObjectMapper objectMapper;
    private final BigDecimal highValueThreshold;

    public WorkflowEngine(
            PurchaseRequestRepository requestRepository,
            ApprovalHistoryRepository historyRepository,
            HumanReviewRepository reviewRepository,
            AiAnalysisRepository aiAnalysisRepository,
            BudgetRepository budgetRepository,
            BudgetService budgetService,
            UserRepository userRepository,
            NotificationService notificationService,
            OutboxService outboxService,
            AiAnalysisService aiAnalysisService,
            PurchaseOrderService purchaseOrderService,
            ObjectMapper objectMapper,
            @Value("${procura.workflow.high-value-threshold:50000.00}") BigDecimal highValueThreshold) {
        this.requestRepository = requestRepository;
        this.historyRepository = historyRepository;
        this.reviewRepository = reviewRepository;
        this.aiAnalysisRepository = aiAnalysisRepository;
        this.budgetRepository = budgetRepository;
        this.budgetService = budgetService;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.outboxService = outboxService;
        this.aiAnalysisService = aiAnalysisService;
        this.purchaseOrderService = purchaseOrderService;
        this.objectMapper = objectMapper;
        this.highValueThreshold = highValueThreshold;
    }

    /**
     * Submit or resubmit request (T1, T6).
     */
    @Transactional
    public PurchaseRequest submit(String requestId, int expectedVersion, UserPrincipal actor) {
        PurchaseRequest request = getRequest(requestId);
        validateVersion(request, expectedVersion);

        if (!request.getRequester().getId().equals(actor.getId())) {
            throw new Exceptions.ForbiddenException("Only the requester can submit this request.");
        }

        if (request.getStatus() != RequestStatus.DRAFT && request.getStatus() != RequestStatus.INFO_REQUESTED) {
            throw new Exceptions.InvalidTransitionException("Cannot submit request in status " + request.getStatus());
        }

        RequestStatus fromStatus = request.getStatus();
        request.setStatus(RequestStatus.SUBMITTED);
        OffsetDateTime now = OffsetDateTime.now();
        request.setSubmittedAt(now);
        request.setAiStatus(AiStatus.PENDING);

        // Budget snapshot at submit time (D18)
        Budget budget = budgetRepository.findByDepartmentIdAndFiscalYear(request.getDepartment().getId(), "2026-27").orElse(null);
        if (budget != null) {
            request.setBudgetTotalAtSubmit(budget.getTotal());
            request.setBudgetRemainingAtSubmit(budget.getRemaining());
        }

        AppUser user = userRepository.getReferenceById(actor.getId());
        PurchaseRequest saved = requestRepository.save(request);

        // Record history
        recordHistory(saved.getId(), HistoryEvent.REQUEST_SUBMITTED, ActorType.USER, user, fromStatus, RequestStatus.SUBMITTED, null, null, false, null);

        // Notify department heads
        notificationService.notifyDepartmentHeads(
                saved.getDepartment().getId(),
                HistoryEvent.REQUEST_SUBMITTED,
                saved.getId(),
                "New purchase request " + saved.getId() + " submitted: " + saved.getTitle(),
                false,
                null,
                null
        );

        // Outbox event for AI service
        outboxService.publishEvent("PURCHASE_REQUEST", saved.getId(), "REQUEST_SUBMITTED", "{\"requestId\": \"" + saved.getId() + "\"}");

        // Immediate async dispatch
        aiAnalysisService.processRequestAnalysisAsync(saved.getId(), now);

        return saved;
    }

    /**
     * Approve request:
     * - If SUBMITTED: Department Head approves (T2 or T3).
     * - If DEPARTMENT_APPROVED: Finance Manager approves (T7).
     */
    @Transactional
    public PurchaseRequest approve(String requestId, int expectedVersion, String comment, UserPrincipal actor) {
        PurchaseRequest request = getRequest(requestId);
        validateVersion(request, expectedVersion);
        checkNotOwner(request, actor);

        AppUser user = userRepository.getReferenceById(actor.getId());
        AiAnalysisEntity latestAi = getLatestAiAnalysis(request);
        Recommendation aiRec = latestAi != null ? latestAi.getRecommendation() : null;

        if (request.getStatus() == RequestStatus.SUBMITTED) {
            // Department Head approval
            if (actor.getRole() != Role.DEPARTMENT_HEAD || actor.getDepartmentId() == null ||
                    !actor.getDepartmentId().equals(request.getDepartment().getId())) {
                throw new Exceptions.ForbiddenException("Only the department head of " + request.getDepartment().getName() + " can approve this request.");
            }

            // Decide T2 vs T3: Check review triggers
            List<ReviewTriggerDto> triggers = evaluateReviewTriggers(request, latestAi);
            boolean reviewNeeded = !triggers.isEmpty();

            if (reviewNeeded) {
                // T3: SUBMITTED -> HUMAN_REVIEW
                request.setStatus(RequestStatus.HUMAN_REVIEW);

                // Create HumanReview task
                HumanReview review = new HumanReview();
                review.setRequestId(request.getId());
                review.setRequestTitle(request.getTitle());
                review.setAmount(request.getAmount());
                review.setStatus("OPEN");
                try {
                    review.setTriggersJson(objectMapper.writeValueAsString(triggers));
                } catch (Exception e) {
                    review.setTriggersJson("[]");
                }
                review.setAiRecommendation(aiRec);
                review.setAiConfidence(latestAi != null ? latestAi.getConfidence() : null);
                HumanReview savedReview = reviewRepository.save(review);

                request.setOpenReviewId(savedReview.getId());
                PurchaseRequest saved = requestRepository.save(request);

                recordHistory(saved.getId(), HistoryEvent.DEPARTMENT_APPROVED, ActorType.USER, user,
                        RequestStatus.SUBMITTED, RequestStatus.HUMAN_REVIEW, HumanDecision.APPROVE, aiRec, false, comment);

                recordHistory(saved.getId(), HistoryEvent.HUMAN_REVIEW_REQUIRED, ActorType.SYSTEM, null,
                        RequestStatus.HUMAN_REVIEW, RequestStatus.HUMAN_REVIEW, null, aiRec, false, "Escalated to human review due to policy triggers.");

                notificationService.notifyUser(saved.getRequester(), HistoryEvent.DEPARTMENT_APPROVED, saved.getId(),
                        saved.getId() + " approved by Department Head. Escalated to human review.", false, aiRec, HumanDecision.APPROVE);

                notificationService.notifyFinanceManagers(HistoryEvent.HUMAN_REVIEW_REQUIRED, saved.getId(),
                        saved.getId() + " requires Finance human review: " + triggers.get(0).text(), false, aiRec, null);

                return saved;

            } else {
                // T2: SUBMITTED -> DEPARTMENT_APPROVED
                request.setStatus(RequestStatus.DEPARTMENT_APPROVED);
                PurchaseRequest saved = requestRepository.save(request);

                recordHistory(saved.getId(), HistoryEvent.DEPARTMENT_APPROVED, ActorType.USER, user,
                        RequestStatus.SUBMITTED, RequestStatus.DEPARTMENT_APPROVED, HumanDecision.APPROVE, aiRec, false, comment);

                notificationService.notifyUser(saved.getRequester(), HistoryEvent.DEPARTMENT_APPROVED, saved.getId(),
                        saved.getId() + " approved by Department Head.", false, aiRec, HumanDecision.APPROVE);

                notificationService.notifyFinanceManagers(HistoryEvent.DEPARTMENT_APPROVED, saved.getId(),
                        saved.getId() + " approved by department. Waiting for finance approval.", false, aiRec, null);

                return saved;
            }

        } else if (request.getStatus() == RequestStatus.DEPARTMENT_APPROVED) {
            // T7: Finance Manager approval
            if (actor.getRole() != Role.FINANCE_MANAGER) {
                throw new Exceptions.ForbiddenException("Only a finance manager can grant finance approval.");
            }

            boolean isOverride = aiRec == Recommendation.REJECT;
            if (isOverride && (comment == null || comment.isBlank())) {
                throw new Exceptions.ValidationException("A comment is required when approving contrary to the AI rejection recommendation.");
            }

            // Reserve budget atomically
            budgetService.reserveBudget(request.getDepartment().getId(), "2026-27", request.getAmount());

            request.setStatus(RequestStatus.FINANCE_APPROVED);
            PurchaseRequest saved = requestRepository.save(request);

            recordHistory(saved.getId(), HistoryEvent.FINANCE_APPROVED, ActorType.USER, user,
                    RequestStatus.DEPARTMENT_APPROVED, RequestStatus.FINANCE_APPROVED, HumanDecision.APPROVE, aiRec, isOverride, comment);

            notificationService.notifyUser(saved.getRequester(), HistoryEvent.FINANCE_APPROVED, saved.getId(),
                    saved.getId() + " approved by Finance.", isOverride, aiRec, HumanDecision.APPROVE);
            notificationService.notifyDepartmentHeads(saved.getDepartment().getId(), HistoryEvent.FINANCE_APPROVED, saved.getId(),
                    saved.getId() + " approved by Finance.", isOverride, aiRec, HumanDecision.APPROVE);

            // Automatic PO generation (T12)
            try {
                purchaseOrderService.generatePurchaseOrder(saved);
            } catch (Exception e) {
                log.warn("Automatic PO generation deferred or failed for {}: {}", saved.getId(), e.getMessage());
            }

            return requestRepository.findById(saved.getId()).orElse(saved);

        } else {
            throw new Exceptions.InvalidTransitionException("Cannot approve request in status " + request.getStatus());
        }
    }

    /**
     * Reject request (T4, T8).
     */
    @Transactional
    public PurchaseRequest reject(String requestId, int expectedVersion, String comment, UserPrincipal actor) {
        PurchaseRequest request = getRequest(requestId);
        validateVersion(request, expectedVersion);
        checkNotOwner(request, actor);

        if (comment == null || comment.isBlank()) {
            throw new Exceptions.ValidationException("A comment is required when rejecting a request.");
        }

        AppUser user = userRepository.getReferenceById(actor.getId());
        AiAnalysisEntity latestAi = getLatestAiAnalysis(request);
        Recommendation aiRec = latestAi != null ? latestAi.getRecommendation() : null;
        boolean isOverride = aiRec == Recommendation.APPROVE;

        RequestStatus fromStatus = request.getStatus();

        if (fromStatus == RequestStatus.SUBMITTED) {
            // T4: Department Head rejection
            if (actor.getRole() != Role.DEPARTMENT_HEAD || actor.getDepartmentId() == null ||
                    !actor.getDepartmentId().equals(request.getDepartment().getId())) {
                throw new Exceptions.ForbiddenException("Only the department head can reject this request.");
            }
            request.setRejectedAtStage("DEPARTMENT");

        } else if (fromStatus == RequestStatus.DEPARTMENT_APPROVED) {
            // T8: Finance Manager rejection
            if (actor.getRole() != Role.FINANCE_MANAGER) {
                throw new Exceptions.ForbiddenException("Only a finance manager can reject at this stage.");
            }
            request.setRejectedAtStage("FINANCE");

        } else {
            throw new Exceptions.InvalidTransitionException("Cannot reject request in status " + fromStatus);
        }

        request.setStatus(RequestStatus.REJECTED);
        PurchaseRequest saved = requestRepository.save(request);

        recordHistory(saved.getId(), HistoryEvent.REQUEST_REJECTED, ActorType.USER, user,
                fromStatus, RequestStatus.REJECTED, HumanDecision.REJECT, aiRec, isOverride, comment);

        notificationService.notifyUser(saved.getRequester(), HistoryEvent.REQUEST_REJECTED, saved.getId(),
                saved.getId() + " was rejected: " + comment, isOverride, aiRec, HumanDecision.REJECT);

        return saved;
    }

    /**
     * Request additional information (T5).
     */
    @Transactional
    public PurchaseRequest requestInformation(String requestId, int expectedVersion, String comment, UserPrincipal actor) {
        PurchaseRequest request = getRequest(requestId);
        validateVersion(request, expectedVersion);
        checkNotOwner(request, actor);

        if (comment == null || comment.isBlank()) {
            throw new Exceptions.ValidationException("A comment is required when requesting information.");
        }

        if (request.getStatus() != RequestStatus.SUBMITTED) {
            throw new Exceptions.InvalidTransitionException("Cannot request information for request in status " + request.getStatus());
        }

        if (actor.getRole() != Role.DEPARTMENT_HEAD || actor.getDepartmentId() == null ||
                !actor.getDepartmentId().equals(request.getDepartment().getId())) {
            throw new Exceptions.ForbiddenException("Only the department head can request information.");
        }

        AppUser user = userRepository.getReferenceById(actor.getId());
        request.setStatus(RequestStatus.INFO_REQUESTED);
        PurchaseRequest saved = requestRepository.save(request);

        recordHistory(saved.getId(), HistoryEvent.INFO_REQUESTED, ActorType.USER, user,
                RequestStatus.SUBMITTED, RequestStatus.INFO_REQUESTED, HumanDecision.REQUEST_INFORMATION, null, false, comment);

        notificationService.notifyUser(saved.getRequester(), HistoryEvent.INFO_REQUESTED, saved.getId(),
                "More information requested on " + saved.getId() + ": " + comment, false, null, HumanDecision.REQUEST_INFORMATION);

        return saved;
    }

    /**
     * Record human review decision (T9, T10, T11).
     */
    @Transactional
    public PurchaseRequest decideReview(Long reviewId, int expectedVersion, HumanDecision decision, String comment, UserPrincipal actor) {
        HumanReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new Exceptions.NotFoundException("Review not found with id: " + reviewId));

        if (!"OPEN".equals(review.getStatus())) {
            throw new Exceptions.InvalidTransitionException("Review task is already decided.");
        }

        PurchaseRequest request = getRequest(review.getRequestId());
        validateVersion(request, expectedVersion);
        checkNotOwner(request, actor);

        if (actor.getRole() != Role.FINANCE_MANAGER) {
            throw new Exceptions.ForbiddenException("Only finance managers can decide human reviews.");
        }

        if (request.getStatus() != RequestStatus.HUMAN_REVIEW) {
            throw new Exceptions.InvalidTransitionException("Request is not in HUMAN_REVIEW status.");
        }

        AiAnalysisEntity latestAi = getLatestAiAnalysis(request);
        Recommendation aiRec = latestAi != null ? latestAi.getRecommendation() : null;
        boolean isOverride = (aiRec == Recommendation.REJECT && decision == HumanDecision.APPROVE) ||
                             (aiRec == Recommendation.APPROVE && decision == HumanDecision.REJECT);

        if ((decision == HumanDecision.REJECT || decision == HumanDecision.REQUEST_INFORMATION || isOverride) &&
                (comment == null || comment.isBlank())) {
            throw new Exceptions.ValidationException("A comment is required for " + decision + (isOverride ? " (AI disagreement)" : "") + ".");
        }

        AppUser user = userRepository.getReferenceById(actor.getId());

        // Update Review entity
        review.setStatus("DECIDED");
        review.setDecision(decision);
        review.setDecidedBy(user);
        review.setDecidedAt(OffsetDateTime.now());
        review.setOverride(isOverride);
        review.setComment(comment);
        reviewRepository.save(review);

        request.setOpenReviewId(null);

        if (decision == HumanDecision.APPROVE) {
            // T9: HUMAN_REVIEW -> FINANCE_APPROVED
            budgetService.reserveBudget(request.getDepartment().getId(), "2026-27", request.getAmount());

            request.setStatus(RequestStatus.FINANCE_APPROVED);
            PurchaseRequest saved = requestRepository.save(request);

            recordHistory(saved.getId(), HistoryEvent.FINANCE_APPROVED, ActorType.USER, user,
                    RequestStatus.HUMAN_REVIEW, RequestStatus.FINANCE_APPROVED, decision, aiRec, isOverride, comment);

            notificationService.notifyUser(saved.getRequester(), HistoryEvent.FINANCE_APPROVED, saved.getId(),
                    saved.getId() + " approved by Finance after review.", isOverride, aiRec, decision);
            notificationService.notifyDepartmentHeads(saved.getDepartment().getId(), HistoryEvent.FINANCE_APPROVED, saved.getId(),
                    saved.getId() + " approved by Finance after review.", isOverride, aiRec, decision);

            // Automatic PO generation (T12)
            try {
                purchaseOrderService.generatePurchaseOrder(saved);
            } catch (Exception e) {
                log.warn("Automatic PO generation deferred or failed: {}", e.getMessage());
            }

            return requestRepository.findById(saved.getId()).orElse(saved);

        } else if (decision == HumanDecision.REJECT) {
            // T10: HUMAN_REVIEW -> REJECTED
            request.setStatus(RequestStatus.REJECTED);
            request.setRejectedAtStage("REVIEW");
            PurchaseRequest saved = requestRepository.save(request);

            recordHistory(saved.getId(), HistoryEvent.REQUEST_REJECTED, ActorType.USER, user,
                    RequestStatus.HUMAN_REVIEW, RequestStatus.REJECTED, decision, aiRec, isOverride, comment);

            notificationService.notifyUser(saved.getRequester(), HistoryEvent.REQUEST_REJECTED, saved.getId(),
                    saved.getId() + " was rejected during human review: " + comment, isOverride, aiRec, decision);

            return saved;

        } else if (decision == HumanDecision.REQUEST_INFORMATION) {
            // T11: HUMAN_REVIEW -> INFO_REQUESTED
            request.setStatus(RequestStatus.INFO_REQUESTED);
            PurchaseRequest saved = requestRepository.save(request);

            recordHistory(saved.getId(), HistoryEvent.INFO_REQUESTED, ActorType.USER, user,
                    RequestStatus.HUMAN_REVIEW, RequestStatus.INFO_REQUESTED, decision, aiRec, false, comment);

            notificationService.notifyUser(saved.getRequester(), HistoryEvent.INFO_REQUESTED, saved.getId(),
                    "Finance requested more information on " + saved.getId() + ": " + comment, false, aiRec, decision);

            return saved;
        }

        throw new Exceptions.InvalidTransitionException("Unsupported review decision: " + decision);
    }

    /**
     * Retry PO generation (FINANCE_MANAGER, D14).
     */
    @Transactional
    public PurchaseRequest retryPurchaseOrder(String requestId, UserPrincipal actor) {
        if (actor.getRole() != Role.FINANCE_MANAGER) {
            throw new Exceptions.ForbiddenException("Only finance managers can retry purchase order generation.");
        }
        PurchaseRequest request = getRequest(requestId);
        if (request.getStatus() != RequestStatus.FINANCE_APPROVED && request.getStatus() != RequestStatus.PO_GENERATED) {
            throw new Exceptions.InvalidTransitionException("Cannot generate PO for request in status " + request.getStatus());
        }

        purchaseOrderService.generatePurchaseOrder(request);
        return requestRepository.findById(requestId).orElse(request);
    }

    private List<ReviewTriggerDto> evaluateReviewTriggers(PurchaseRequest request, AiAnalysisEntity ai) {
        List<ReviewTriggerDto> triggers = new ArrayList<>();

        // 1. AI result has requiresHumanReview = true (D2)
        if (ai != null && ai.isRequiresHumanReview()) {
            try {
                List<ReviewTriggerDto> aiTriggers = objectMapper.readValue(
                        ai.getReviewTriggersJson(),
                        new com.fasterxml.jackson.core.type.TypeReference<List<ReviewTriggerDto>>() {}
                );
                for (ReviewTriggerDto t : aiTriggers) {
                    triggers.add(ReviewTriggerDto.ai(t.code(), t.text()));
                }
            } catch (Exception e) {
                triggers.add(ReviewTriggerDto.ai("LOW_CONFIDENCE", "Confidence is below review threshold"));
            }
        }

        // 2. High-value rule
        if (request.getAmount() != null && request.getAmount().compareTo(highValueThreshold) > 0) {
            triggers.add(ReviewTriggerDto.rule("HIGH_VALUE", "Amount exceeds high-value threshold of ₹" + highValueThreshold));
        }

        // 3. Budget exceeded rule
        Budget budget = budgetRepository.findByDepartmentIdAndFiscalYear(request.getDepartment().getId(), "2026-27").orElse(null);
        if (budget != null && request.getAmount() != null && request.getAmount().compareTo(budget.getRemaining()) > 0) {
            triggers.add(ReviewTriggerDto.rule("BUDGET_EXCEEDED", "Request amount exceeds department's remaining budget"));
        }

        // 4. Missing or unavailable AI
        if (request.getAiStatus() == AiStatus.PENDING || request.getAiStatus() == AiStatus.UNAVAILABLE) {
            triggers.add(ReviewTriggerDto.rule("AI_UNAVAILABLE", "AI analysis was unavailable or incomplete at approval time"));
        }

        return triggers;
    }

    private PurchaseRequest getRequest(String requestId) {
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new Exceptions.NotFoundException("Purchase request not found: " + requestId));
    }

    private void validateVersion(PurchaseRequest request, int expectedVersion) {
        if (request.getVersion() != expectedVersion) {
            throw new Exceptions.WorkflowConflictException(
                    "Request " + request.getId() + " is currently in state " + request.getStatus() +
                    " (version " + request.getVersion() + "). Someone else may have acted first. Reload to see the latest state."
            );
        }
    }

    private void checkNotOwner(PurchaseRequest request, UserPrincipal actor) {
        if (request.getRequester().getId().equals(actor.getId())) {
            throw new Exceptions.ForbiddenException("You cannot approve, reject, or decide your own purchase request.");
        }
    }

    private AiAnalysisEntity getLatestAiAnalysis(PurchaseRequest request) {
        if (request.getLatestAnalysisId() != null) {
            return aiAnalysisRepository.findById(request.getLatestAnalysisId()).orElse(null);
        }
        return aiAnalysisRepository.findFirstByRequestIdOrderByAnalysedAtDesc(request.getId()).orElse(null);
    }

    private void recordHistory(
            String requestId,
            HistoryEvent event,
            ActorType actorType,
            AppUser actor,
            RequestStatus fromStatus,
            RequestStatus toStatus,
            HumanDecision decision,
            Recommendation aiRec,
            boolean override,
            String comment
    ) {
        ApprovalHistory h = new ApprovalHistory();
        h.setRequestId(requestId);
        h.setEvent(event);
        h.setActorType(actorType);
        h.setActor(actor);
        h.setFromStatus(fromStatus);
        h.setToStatus(toStatus);
        h.setDecision(decision);
        h.setAiRecommendation(aiRec);
        h.setOverride(override);
        h.setComment(comment);
        historyRepository.save(h);
    }
}

