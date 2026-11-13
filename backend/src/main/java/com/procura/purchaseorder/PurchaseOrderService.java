package com.procura.purchaseorder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.audit.ApprovalHistory;
import com.procura.audit.ApprovalHistoryRepository;
import com.procura.budget.BudgetService;
import com.procura.common.enums.ActorType;
import com.procura.common.enums.HistoryEvent;
import com.procura.common.enums.RequestStatus;
import com.procura.common.error.Exceptions;
import com.procura.notification.NotificationService;
import com.procura.procurement.PurchaseRequest;
import com.procura.procurement.PurchaseRequestItem;
import com.procura.procurement.PurchaseRequestRepository;
import com.procura.purchaseorder.dto.PurchaseOrderDto;
import com.procura.user.AppUser;
import com.procura.user.dto.UserRefDto;
import com.procura.vendor.Vendor;
import com.procura.vendor.VendorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class PurchaseOrderService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseOrderService.class);
    private final java.util.concurrent.atomic.AtomicLong fallbackPoSeq = new java.util.concurrent.atomic.AtomicLong(1);

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final VendorRepository vendorRepository;
    private final BudgetService budgetService;
    private final ApprovalHistoryRepository historyRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public PurchaseOrderService(
            PurchaseOrderRepository purchaseOrderRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            VendorRepository vendorRepository,
            BudgetService budgetService,
            ApprovalHistoryRepository historyRepository,
            NotificationService notificationService,
            ObjectMapper objectMapper) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.vendorRepository = vendorRepository;
        this.budgetService = budgetService;
        this.historyRepository = historyRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PurchaseOrder generatePurchaseOrder(PurchaseRequest request) {
        // Idempotency check: if PO already exists, return it
        Optional<PurchaseOrder> existing = purchaseOrderRepository.findByPurchaseRequestId(request.getId());
        if (existing.isPresent()) {
            log.info("Purchase order already exists for request {}: {}", request.getId(), existing.get().getId());
            return existing.get();
        }

        if (request.getStatus() != RequestStatus.FINANCE_APPROVED && request.getStatus() != RequestStatus.PO_GENERATED) {
            throw new Exceptions.InvalidTransitionException("Cannot generate purchase order for request in status " + request.getStatus());
        }

        try {
            Long seq;
            try {
                seq = purchaseOrderRepository.getNextSequenceValue();
            } catch (Exception e) {
                log.warn("Could not retrieve nextval('purchase_order_seq'), using atomic fallback: {}", e.getMessage());
                seq = fallbackPoSeq.incrementAndGet();
            }
            String poId = String.format("PO-2026-%04d", seq);

            // Snapshot approvers from history
            List<ApprovalHistory> history = historyRepository.findAllByRequestIdOrderByCreatedAtAsc(request.getId());
            List<UserRefDto> approvers = new ArrayList<>();
            for (ApprovalHistory h : history) {
                if ((h.getEvent() == HistoryEvent.DEPARTMENT_APPROVED || h.getEvent() == HistoryEvent.FINANCE_APPROVED) && h.getActor() != null) {
                    approvers.add(UserRefDto.fromEntity(h.getActor()));
                }
            }

            PurchaseOrder po = new PurchaseOrder();
            po.setId(poId);
            po.setPurchaseRequestId(request.getId());
            po.setVendor(request.getVendor());
            po.setDepartmentName(request.getDepartment().getName());
            po.setTotal(request.getAmount());
            po.setCurrency(request.getCurrency());
            po.setIssuedAt(OffsetDateTime.now());
            po.setApprovedByJson(objectMapper.writeValueAsString(approvers));

            for (PurchaseRequestItem item : request.getItems()) {
                PurchaseOrderItem poItem = new PurchaseOrderItem(item.getDescription(), item.getQuantity(), item.getUnitPrice());
                po.addItem(poItem);
            }

            PurchaseOrder savedPo = purchaseOrderRepository.save(po);

            // Update request
            request.setPurchaseOrderId(savedPo.getId());
            request.setStatus(RequestStatus.PO_GENERATED);
            purchaseRequestRepository.save(request);

            // Update budget (committed -> spent)
            budgetService.recordPurchaseOrderIssued(request.getDepartment().getId(), "2026-27", request.getAmount());

            // Update vendor stats
            Vendor vendor = request.getVendor();
            vendor.setCompletedOrders(vendor.getCompletedOrders() + 1);
            if (vendor.getFirstOrderAt() == null) {
                vendor.setFirstOrderAt(OffsetDateTime.now());
            }
            vendorRepository.save(vendor);

            // Append PO_GENERATED history
            ApprovalHistory poHistory = new ApprovalHistory();
            poHistory.setRequestId(request.getId());
            poHistory.setEvent(HistoryEvent.PO_GENERATED);
            poHistory.setActorType(ActorType.SYSTEM);
            poHistory.setFromStatus(RequestStatus.FINANCE_APPROVED);
            poHistory.setToStatus(RequestStatus.PO_GENERATED);
            historyRepository.save(poHistory);

            // Notify requester and finance managers
            notificationService.notifyUser(
                    request.getRequester(),
                    HistoryEvent.PO_GENERATED,
                    request.getId(),
                    "Purchase Order " + poId + " issued for " + request.getId(),
                    false,
                    null,
                    null
            );
            notificationService.notifyFinanceManagers(
                    HistoryEvent.PO_GENERATED,
                    request.getId(),
                    "Purchase Order " + poId + " generated successfully for " + request.getId(),
                    false,
                    null,
                    null
            );

            return savedPo;

        } catch (Exception e) {
            log.error("Failed to generate purchase order for request {}: {}", request.getId(), e.getMessage(), e);

            ApprovalHistory failHistory = new ApprovalHistory();
            failHistory.setRequestId(request.getId());
            failHistory.setEvent(HistoryEvent.PO_GENERATION_FAILED);
            failHistory.setActorType(ActorType.SYSTEM);
            failHistory.setFromStatus(RequestStatus.FINANCE_APPROVED);
            failHistory.setToStatus(RequestStatus.FINANCE_APPROVED);
            failHistory.setComment("Failed to generate purchase order: " + e.getMessage());
            historyRepository.save(failHistory);

            notificationService.notifyFinanceManagers(
                    HistoryEvent.PO_GENERATION_FAILED,
                    request.getId(),
                    "Failed to generate purchase order for " + request.getId() + ". Retry available.",
                    false,
                    null,
                    null
            );

            throw new RuntimeException("Purchase order generation failed: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public PurchaseOrderDto getPurchaseOrder(String id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new Exceptions.NotFoundException("Purchase Order not found: " + id));
        return PurchaseOrderDto.fromEntity(po, objectMapper);
    }

    @Transactional(readOnly = true)
    public com.procura.common.dto.PagedResponse<PurchaseOrderDto> listPurchaseOrders(int page, int size, com.procura.security.UserPrincipal actor) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        boolean canSeeAll = actor.getRole() == com.procura.common.enums.Role.FINANCE_MANAGER || actor.getRole() == com.procura.common.enums.Role.ADMIN;
        org.springframework.data.domain.Page<PurchaseOrder> poPage = purchaseOrderRepository.findVisibleOrders(
                canSeeAll,
                actor.getId(),
                actor.getDepartmentId(),
                pageable
        );

        List<PurchaseOrderDto> items = poPage.getContent().stream()
                .map(po -> PurchaseOrderDto.fromEntity(po, objectMapper))
                .toList();

        return com.procura.common.dto.PagedResponse.of(page, size, poPage.getTotalElements(), items);
    }
}
