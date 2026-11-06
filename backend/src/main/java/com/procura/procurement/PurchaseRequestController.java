package com.procura.procurement;

import com.procura.ai.dto.AiAnalysisDto;
import com.procura.audit.dto.HistoryEntryDto;
import com.procura.common.dto.PagedResponse;
import com.procura.common.enums.RequestStatus;
import com.procura.procurement.dto.PurchaseRequestDetailDto;
import com.procura.procurement.dto.PurchaseRequestInputDto;
import com.procura.procurement.dto.PurchaseRequestSummaryDto;
import com.procura.purchaseorder.PurchaseOrderService;
import com.procura.purchaseorder.dto.PurchaseOrderDto;
import com.procura.security.UserPrincipal;
import com.procura.workflow.WorkflowEngine;
import com.procura.workflow.dto.ActionDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/purchase-requests", "/purchase-requests"})
public class PurchaseRequestController {

    private final PurchaseRequestService purchaseRequestService;
    private final WorkflowEngine workflowEngine;
    private final PurchaseOrderService purchaseOrderService;

    public PurchaseRequestController(
            PurchaseRequestService purchaseRequestService,
            WorkflowEngine workflowEngine,
            PurchaseOrderService purchaseOrderService) {
        this.purchaseRequestService = purchaseRequestService;
        this.workflowEngine = workflowEngine;
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<PurchaseRequestSummaryDto>> listPurchaseRequests(
            @RequestParam(required = false) List<RequestStatus> status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Boolean mine,
            @RequestParam(required = false) Boolean needsMyAction,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "-submittedAt") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(purchaseRequestService.listRequests(status, departmentId, mine, needsMyAction, q, sort, page, size, principal));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('REQUESTER', 'DEPARTMENT_HEAD')")
    public ResponseEntity<PurchaseRequestDetailDto> createPurchaseRequest(
            @Valid @RequestBody PurchaseRequestInputDto input,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        PurchaseRequestDetailDto created = purchaseRequestService.createDraft(input, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseRequestDetailDto> getPurchaseRequest(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(purchaseRequestService.getRequestDetail(id, principal));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PurchaseRequestDetailDto> updatePurchaseRequest(
            @PathVariable String id,
            @Valid @RequestBody PurchaseRequestInputDto input,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(purchaseRequestService.updateDraft(id, input, principal));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePurchaseRequest(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        purchaseRequestService.deleteDraft(id, principal);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<PurchaseRequestDetailDto> submitPurchaseRequest(
            @PathVariable String id,
            @Valid @RequestBody ActionDtos.VersionedAction action,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        workflowEngine.submit(id, action.version(), principal);
        return ResponseEntity.ok(purchaseRequestService.getRequestDetail(id, principal));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<PurchaseRequestDetailDto> approvePurchaseRequest(
            @PathVariable String id,
            @Valid @RequestBody ActionDtos.DecisionAction action,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        workflowEngine.approve(id, action.version(), action.comment(), principal);
        return ResponseEntity.ok(purchaseRequestService.getRequestDetail(id, principal));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<PurchaseRequestDetailDto> rejectPurchaseRequest(
            @PathVariable String id,
            @Valid @RequestBody ActionDtos.DecisionActionCommentRequired action,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        workflowEngine.reject(id, action.version(), action.comment(), principal);
        return ResponseEntity.ok(purchaseRequestService.getRequestDetail(id, principal));
    }

    @PostMapping("/{id}/request-information")
    public ResponseEntity<PurchaseRequestDetailDto> requestInformation(
            @PathVariable String id,
            @Valid @RequestBody ActionDtos.DecisionActionCommentRequired action,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        workflowEngine.requestInformation(id, action.version(), action.comment(), principal);
        return ResponseEntity.ok(purchaseRequestService.getRequestDetail(id, principal));
    }

    @PostMapping("/{id}/purchase-order")
    @PreAuthorize("hasRole('FINANCE_MANAGER')")
    public ResponseEntity<PurchaseOrderDto> retryPurchaseOrder(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        PurchaseRequest updated = workflowEngine.retryPurchaseOrder(id, principal);
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrder(updated.getPurchaseOrderId()));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<HistoryEntryDto>> getRequestHistory(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(purchaseRequestService.getRequestHistory(id, principal));
    }

    @GetMapping("/{id}/ai-analyses")
    public ResponseEntity<List<AiAnalysisDto>> listAiAnalyses(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(purchaseRequestService.getRequestAiAnalyses(id, principal));
    }
}
