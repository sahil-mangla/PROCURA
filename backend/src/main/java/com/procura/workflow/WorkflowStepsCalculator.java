package com.procura.workflow;

import com.procura.audit.ApprovalHistory;
import com.procura.audit.ApprovalHistoryRepository;
import com.procura.common.enums.*;
import com.procura.procurement.PurchaseRequest;
import com.procura.user.AppUser;
import com.procura.user.dto.UserRefDto;
import com.procura.workflow.dto.WorkflowStepDto;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class WorkflowStepsCalculator {

    private final ApprovalHistoryRepository historyRepository;

    public WorkflowStepsCalculator(ApprovalHistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    public List<WorkflowStepDto> calculateSteps(PurchaseRequest request) {
        List<WorkflowStepDto> steps = new ArrayList<>();
        List<ApprovalHistory> history = historyRepository.findAllByRequestIdOrderByCreatedAtAsc(request.getId());

        // 1. SUBMITTED
        ApprovalHistory submitEntry = findHistory(history, HistoryEvent.REQUEST_SUBMITTED);
        WorkflowStepState submitState = request.getStatus() == RequestStatus.DRAFT ? WorkflowStepState.CURRENT : WorkflowStepState.DONE;
        steps.add(new WorkflowStepDto(
                WorkflowStepKey.SUBMITTED,
                "Request submitted",
                submitState,
                submitEntry != null ? UserRefDto.fromEntity(submitEntry.getActor()) : UserRefDto.fromEntity(request.getRequester()),
                submitEntry != null ? submitEntry.getCreatedAt() : request.getSubmittedAt()
        ));

        // 2. AI_ANALYSIS
        ApprovalHistory aiEntry = findHistory(history, HistoryEvent.AI_ANALYSIS_COMPLETED);
        ApprovalHistory aiFail = findHistory(history, HistoryEvent.AI_UNAVAILABLE);
        WorkflowStepState aiState;
        if (request.getAiStatus() == AiStatus.COMPLETED) {
            aiState = WorkflowStepState.DONE;
        } else if (request.getAiStatus() == AiStatus.UNAVAILABLE) {
            aiState = WorkflowStepState.FAILED;
        } else if (request.getAiStatus() == AiStatus.PENDING) {
            aiState = WorkflowStepState.CURRENT;
        } else {
            aiState = WorkflowStepState.PENDING;
        }
        steps.add(new WorkflowStepDto(
                WorkflowStepKey.AI_ANALYSIS,
                "AI recommendation",
                aiState,
                null,
                aiEntry != null ? aiEntry.getCreatedAt() : (aiFail != null ? aiFail.getCreatedAt() : null)
        ));

        // 3. DEPARTMENT_APPROVAL
        ApprovalHistory deptEntry = findHistory(history, HistoryEvent.DEPARTMENT_APPROVED);
        ApprovalHistory deptReject = history.stream()
                .filter(h -> h.getEvent() == HistoryEvent.REQUEST_REJECTED && "DEPARTMENT".equals(request.getRejectedAtStage()))
                .findFirst().orElse(null);

        WorkflowStepState deptState;
        if (deptEntry != null) {
            deptState = WorkflowStepState.DONE;
        } else if (deptReject != null) {
            deptState = WorkflowStepState.FAILED;
        } else if (request.getStatus() == RequestStatus.SUBMITTED) {
            deptState = WorkflowStepState.CURRENT;
        } else {
            deptState = WorkflowStepState.PENDING;
        }
        steps.add(new WorkflowStepDto(
                WorkflowStepKey.DEPARTMENT_APPROVAL,
                "Department approval",
                deptState,
                deptEntry != null ? UserRefDto.fromEntity(deptEntry.getActor()) : (deptReject != null ? UserRefDto.fromEntity(deptReject.getActor()) : null),
                deptEntry != null ? deptEntry.getCreatedAt() : (deptReject != null ? deptReject.getCreatedAt() : null)
        ));

        // 4. HUMAN_REVIEW
        boolean hadReview = history.stream().anyMatch(h -> h.getEvent() == HistoryEvent.HUMAN_REVIEW_REQUIRED);
        ApprovalHistory reviewDecision = history.stream()
                .filter(h -> h.getFromStatus() == RequestStatus.HUMAN_REVIEW)
                .findFirst().orElse(null);

        WorkflowStepState reviewState;
        if (request.getStatus() == RequestStatus.HUMAN_REVIEW) {
            reviewState = WorkflowStepState.CURRENT;
        } else if (hadReview) {
            reviewState = (request.getStatus() == RequestStatus.REJECTED && "REVIEW".equals(request.getRejectedAtStage())) ?
                    WorkflowStepState.FAILED : WorkflowStepState.DONE;
        } else if (request.getStatus() == RequestStatus.DEPARTMENT_APPROVED ||
                   request.getStatus() == RequestStatus.FINANCE_APPROVED ||
                   request.getStatus() == RequestStatus.PO_GENERATED) {
            reviewState = WorkflowStepState.SKIPPED;
        } else {
            reviewState = WorkflowStepState.PENDING;
        }
        steps.add(new WorkflowStepDto(
                WorkflowStepKey.HUMAN_REVIEW,
                "Human review",
                reviewState,
                reviewDecision != null ? UserRefDto.fromEntity(reviewDecision.getActor()) : null,
                reviewDecision != null ? reviewDecision.getCreatedAt() : null
        ));

        // 5. FINANCE_APPROVAL
        ApprovalHistory finEntry = findHistory(history, HistoryEvent.FINANCE_APPROVED);
        ApprovalHistory finReject = history.stream()
                .filter(h -> h.getEvent() == HistoryEvent.REQUEST_REJECTED && "FINANCE".equals(request.getRejectedAtStage()))
                .findFirst().orElse(null);

        WorkflowStepState finState;
        if (finEntry != null) {
            finState = WorkflowStepState.DONE;
        } else if (finReject != null) {
            finState = WorkflowStepState.FAILED;
        } else if (request.getStatus() == RequestStatus.DEPARTMENT_APPROVED) {
            finState = WorkflowStepState.CURRENT;
        } else {
            finState = WorkflowStepState.PENDING;
        }
        steps.add(new WorkflowStepDto(
                WorkflowStepKey.FINANCE_APPROVAL,
                "Finance approval",
                finState,
                finEntry != null ? UserRefDto.fromEntity(finEntry.getActor()) : (finReject != null ? UserRefDto.fromEntity(finReject.getActor()) : null),
                finEntry != null ? finEntry.getCreatedAt() : (finReject != null ? finReject.getCreatedAt() : null)
        ));

        // 6. PURCHASE_ORDER
        ApprovalHistory poEntry = findHistory(history, HistoryEvent.PO_GENERATED);
        ApprovalHistory poFail = findHistory(history, HistoryEvent.PO_GENERATION_FAILED);

        WorkflowStepState poState;
        if (request.getStatus() == RequestStatus.PO_GENERATED) {
            poState = WorkflowStepState.DONE;
        } else if (request.getStatus() == RequestStatus.FINANCE_APPROVED) {
            poState = (poFail != null) ? WorkflowStepState.FAILED : WorkflowStepState.CURRENT;
        } else {
            poState = WorkflowStepState.PENDING;
        }
        steps.add(new WorkflowStepDto(
                WorkflowStepKey.PURCHASE_ORDER,
                "Purchase order",
                poState,
                null,
                poEntry != null ? poEntry.getCreatedAt() : (poFail != null ? poFail.getCreatedAt() : null)
        ));

        return steps;
    }

    private ApprovalHistory findHistory(List<ApprovalHistory> history, HistoryEvent event) {
        return history.stream().filter(h -> h.getEvent() == event).findFirst().orElse(null);
    }
}

