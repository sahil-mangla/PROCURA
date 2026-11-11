package com.procura.procurement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.ai.AiAnalysisEntity;
import com.procura.ai.AiAnalysisRepository;
import com.procura.ai.dto.AiAnalysisDto;
import com.procura.audit.ApprovalHistory;
import com.procura.audit.ApprovalHistoryRepository;
import com.procura.audit.dto.HistoryEntryDto;
import com.procura.budget.Budget;
import com.procura.budget.BudgetRepository;
import com.procura.budget.dto.BudgetDto;
import com.procura.common.dto.PagedResponse;
import com.procura.common.enums.*;
import com.procura.common.error.Exceptions;
import com.procura.department.Department;
import com.procura.department.DepartmentRepository;
import com.procura.procurement.dto.LineItemDto;
import com.procura.procurement.dto.PurchaseRequestDetailDto;
import com.procura.procurement.dto.PurchaseRequestInputDto;
import com.procura.procurement.dto.PurchaseRequestSummaryDto;
import com.procura.security.UserPrincipal;
import com.procura.user.AppUser;
import com.procura.user.UserRepository;
import com.procura.user.dto.UserRefDto;
import com.procura.vendor.Vendor;
import com.procura.vendor.VendorRepository;
import com.procura.vendor.dto.VendorDto;
import com.procura.workflow.AllowedActionsCalculator;
import com.procura.workflow.WorkflowStepsCalculator;
import com.procura.workflow.dto.WorkflowStepDto;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PurchaseRequestService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseRequestService.class);
    private final AtomicLong fallbackPrSeq = new AtomicLong(1000);

    private final PurchaseRequestRepository requestRepository;
    private final PurchaseRequestItemRepository itemRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final VendorRepository vendorRepository;
    private final BudgetRepository budgetRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final ApprovalHistoryRepository historyRepository;
    private final AllowedActionsCalculator allowedActionsCalculator;
    private final WorkflowStepsCalculator workflowStepsCalculator;
    private final ObjectMapper objectMapper;

    public PurchaseRequestService(
            PurchaseRequestRepository requestRepository,
            PurchaseRequestItemRepository itemRepository,
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            VendorRepository vendorRepository,
            BudgetRepository budgetRepository,
            AiAnalysisRepository aiAnalysisRepository,
            ApprovalHistoryRepository historyRepository,
            AllowedActionsCalculator allowedActionsCalculator,
            WorkflowStepsCalculator workflowStepsCalculator,
            ObjectMapper objectMapper) {
        this.requestRepository = requestRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.vendorRepository = vendorRepository;
        this.budgetRepository = budgetRepository;
        this.aiAnalysisRepository = aiAnalysisRepository;
        this.historyRepository = historyRepository;
        this.allowedActionsCalculator = allowedActionsCalculator;
        this.workflowStepsCalculator = workflowStepsCalculator;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PurchaseRequestDetailDto createDraft(PurchaseRequestInputDto input, UserPrincipal actor) {
        AppUser requester = userRepository.findById(actor.getId())
                .orElseThrow(() -> new Exceptions.NotFoundException("User not found"));

        Department department = requester.getDepartment();
        if (department == null) {
            throw new Exceptions.ValidationException("Requester must belong to a department to create purchase requests.");
        }

        Vendor vendor = vendorRepository.findById(input.vendorId())
                .orElseThrow(() -> new Exceptions.NotFoundException("Vendor not found with id: " + input.vendorId()));

        Long seq;
        try {
            seq = requestRepository.getNextSequenceValue();
        } catch (Exception e) {
            log.warn("Could not retrieve nextval('purchase_request_seq'), using atomic fallback: {}", e.getMessage());
            seq = fallbackPrSeq.incrementAndGet();
        }
        String prId = String.format("PR-%04d", seq);

        PurchaseRequest request = new PurchaseRequest();
        request.setId(prId);
        request.setTitle(input.title().trim());
        request.setDescription(input.description() != null ? input.description().trim() : null);
        request.setCategory(input.category());
        request.setPriority(input.priority() != null ? input.priority() : Priority.NORMAL);
        request.setStatus(RequestStatus.DRAFT);
        request.setRequester(requester);
        request.setDepartment(department);
        request.setVendor(vendor);
        request.setCurrency("INR");
        request.setNeededBy(input.neededBy());
        request.setAiStatus(AiStatus.NOT_STARTED);
        request.setVersion(0);
        request.setCreatedAt(OffsetDateTime.now());
        request.setUpdatedAt(OffsetDateTime.now());

        int sortOrder = 1;
        for (LineItemDto itemDto : input.items()) {
            PurchaseRequestItem item = new PurchaseRequestItem(
                    itemDto.description().trim(),
                    itemDto.quantity(),
                    itemDto.unitPrice(),
                    sortOrder++
            );
            request.addItem(item);
        }
        request.recalculateTotals();

        PurchaseRequest saved = requestRepository.save(request);

        // Record history
        ApprovalHistory history = new ApprovalHistory();
        history.setRequestId(saved.getId());
        history.setEvent(HistoryEvent.REQUEST_CREATED);
        history.setActorType(ActorType.USER);
        history.setActor(requester);
        history.setToStatus(RequestStatus.DRAFT);
        historyRepository.save(history);

        return toDetailDto(saved, actor);
    }

    @Transactional
    public PurchaseRequestDetailDto updateDraft(String id, PurchaseRequestInputDto input, UserPrincipal actor) {
        PurchaseRequest request = getRequest(id);

        if (!request.getRequester().getId().equals(actor.getId())) {
            throw new Exceptions.ForbiddenException("Only the requester can edit this request.");
        }

        if (request.getStatus() != RequestStatus.DRAFT && request.getStatus() != RequestStatus.INFO_REQUESTED) {
            throw new Exceptions.InvalidTransitionException("Only DRAFT or INFO_REQUESTED requests can be edited.");
        }

        if (input.version() != null && request.getVersion() != input.version()) {
            throw new Exceptions.WorkflowConflictException(
                    "Request " + request.getId() + " was modified. Current version is " + request.getVersion() + ". Reload to see the latest version."
            );
        }

        Vendor vendor = vendorRepository.findById(input.vendorId())
                .orElseThrow(() -> new Exceptions.NotFoundException("Vendor not found with id: " + input.vendorId()));

        request.setTitle(input.title().trim());
        request.setDescription(input.description() != null ? input.description().trim() : null);
        request.setCategory(input.category());
        if (input.priority() != null) {
            request.setPriority(input.priority());
        }
        request.setVendor(vendor);
        request.setNeededBy(input.neededBy());
        request.setUpdatedAt(OffsetDateTime.now());

        // Replace items
        request.clearItems();
        int sortOrder = 1;
        for (LineItemDto itemDto : input.items()) {
            PurchaseRequestItem item = new PurchaseRequestItem(
                    itemDto.description().trim(),
                    itemDto.quantity(),
                    itemDto.unitPrice(),
                    sortOrder++
            );
            request.addItem(item);
        }
        request.recalculateTotals();

        PurchaseRequest saved = requestRepository.save(request);
        return toDetailDto(saved, actor);
    }

    @Transactional
    public void deleteDraft(String id, UserPrincipal actor) {
        PurchaseRequest request = getRequest(id);

        if (!request.getRequester().getId().equals(actor.getId())) {
            throw new Exceptions.ForbiddenException("Only the requester can delete this request.");
        }

        if (request.getStatus() != RequestStatus.DRAFT) {
            throw new Exceptions.InvalidTransitionException("Only DRAFT requests can be deleted.");
        }

        requestRepository.delete(request);
    }

    @Transactional(readOnly = true)
    public PurchaseRequestDetailDto getRequestDetail(String id, UserPrincipal actor) {
        PurchaseRequest request = getRequest(id);
        checkViewPermission(request, actor);
        return toDetailDto(request, actor);
    }

    @Transactional(readOnly = true)
    public PagedResponse<PurchaseRequestSummaryDto> listRequests(
            List<RequestStatus> statusList,
            Long departmentId,
            Boolean mine,
            Boolean needsMyAction,
            String q,
            String sortStr,
            int page,
            int size,
            UserPrincipal actor
    ) {
        Sort sort = parseSort(sortStr);
        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<PurchaseRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Role-based scoping
            if (Boolean.TRUE.equals(mine) || actor.getRole() == Role.REQUESTER) {
                predicates.add(cb.equal(root.get("requester").get("id"), actor.getId()));
            } else if (actor.getRole() == Role.DEPARTMENT_HEAD) {
                if (actor.getDepartmentId() != null) {
                    predicates.add(cb.equal(root.get("department").get("id"), actor.getDepartmentId()));
                }
            }
            // Finance and Admin can see all requests unless filtered

            // 2. Department filter
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("department").get("id"), departmentId));
            }

            // 3. Status filter
            if (statusList != null && !statusList.isEmpty()) {
                predicates.add(root.get("status").in(statusList));
            }

            // 4. Search query q (ID, title, vendor name)
            if (q != null && !q.isBlank()) {
                String searchLike = "%" + q.trim().toLowerCase() + "%";
                Predicate idMatch = cb.like(cb.lower(root.get("id")), searchLike);
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), searchLike);
                Predicate vendorMatch = cb.like(cb.lower(root.get("vendor").get("name")), searchLike);
                predicates.add(cb.or(idMatch, titleMatch, vendorMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<PurchaseRequest> requestPage = requestRepository.findAll(spec, pageable);

        List<PurchaseRequestSummaryDto> items = new ArrayList<>();
        for (PurchaseRequest req : requestPage.getContent()) {
            if (Boolean.TRUE.equals(needsMyAction)) {
                List<AllowedAction> actions = allowedActionsCalculator.calculateAllowedActions(req, actor);
                if (actions.isEmpty()) {
                    continue;
                }
            }
            items.add(toSummaryDto(req));
        }

        return PagedResponse.of(page, size, requestPage.getTotalElements(), items);
    }

    @Transactional(readOnly = true)
    public List<HistoryEntryDto> getRequestHistory(String id, UserPrincipal actor) {
        PurchaseRequest request = getRequest(id);
        checkViewPermission(request, actor);
        return historyRepository.findAllByRequestIdOrderByCreatedAtAsc(id).stream()
                .map(HistoryEntryDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AiAnalysisDto> getRequestAiAnalyses(String id, UserPrincipal actor) {
        PurchaseRequest request = getRequest(id);
        checkViewPermission(request, actor);
        return aiAnalysisRepository.findAllByRequestIdOrderByAnalysedAtDesc(id).stream()
                .map(entity -> AiAnalysisDto.fromEntity(entity, objectMapper))
                .toList();
    }

    private PurchaseRequest getRequest(String id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new Exceptions.NotFoundException("Purchase request not found with ID: " + id));
    }

    private void checkViewPermission(PurchaseRequest request, UserPrincipal actor) {
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.FINANCE_MANAGER) {
            return;
        }
        if (actor.getRole() == Role.DEPARTMENT_HEAD) {
            if (actor.getDepartmentId() != null && actor.getDepartmentId().equals(request.getDepartment().getId())) {
                return;
            }
        }
        if (request.getRequester().getId().equals(actor.getId())) {
            return;
        }
        throw new Exceptions.ForbiddenException("You do not have permission to view request " + request.getId());
    }

    private PurchaseRequestDetailDto toDetailDto(PurchaseRequest request, UserPrincipal actor) {
        PurchaseRequestSummaryDto summary = toSummaryDto(request);

        List<LineItemDto> lineItems = request.getItems().stream()
                .map(LineItemDto::fromEntity)
                .toList();

        Budget budget = budgetRepository.findByDepartmentIdAndFiscalYear(request.getDepartment().getId(), "2026-27").orElse(null);
        BudgetDto budgetDto = BudgetDto.fromEntity(budget);

        AiAnalysisEntity aiAnalysis = null;
        if (request.getLatestAnalysisId() != null) {
            aiAnalysis = aiAnalysisRepository.findById(request.getLatestAnalysisId()).orElse(null);
        } else if (request.getAiStatus() == AiStatus.COMPLETED) {
            aiAnalysis = aiAnalysisRepository.findFirstByRequestIdOrderByAnalysedAtDesc(request.getId()).orElse(null);
        }
        AiAnalysisDto aiDto = AiAnalysisDto.fromEntity(aiAnalysis, objectMapper);

        List<AllowedAction> allowedActions = allowedActionsCalculator.calculateAllowedActions(request, actor);
        List<WorkflowStepDto> workflowSteps = workflowStepsCalculator.calculateSteps(request);

        return new PurchaseRequestDetailDto(
                summary.id(),
                summary.title(),
                summary.status(),
                summary.amount(),
                summary.currency(),
                summary.category(),
                summary.priority(),
                summary.requester(),
                summary.departmentId(),
                summary.departmentName(),
                summary.vendorName(),
                summary.submittedAt(),
                summary.aiStatus(),
                summary.aiRecommendation(),
                summary.riskLevel(),
                summary.version(),
                request.getDescription(),
                request.getNeededBy(),
                VendorDto.fromEntity(request.getVendor()),
                lineItems,
                budgetDto,
                aiDto,
                request.getOpenReviewId(),
                request.getPurchaseOrderId(),
                allowedActions,
                workflowSteps,
                request.getCreatedAt()
        );
    }

    private PurchaseRequestSummaryDto toSummaryDto(PurchaseRequest req) {
        AiAnalysisEntity ai = null;
        if (req.getLatestAnalysisId() != null) {
            ai = aiAnalysisRepository.findById(req.getLatestAnalysisId()).orElse(null);
        } else if (req.getAiStatus() == AiStatus.COMPLETED) {
            ai = aiAnalysisRepository.findFirstByRequestIdOrderByAnalysedAtDesc(req.getId()).orElse(null);
        }

        return new PurchaseRequestSummaryDto(
                req.getId(),
                req.getTitle(),
                req.getStatus(),
                req.getAmount(),
                req.getCurrency(),
                req.getCategory(),
                req.getPriority(),
                UserRefDto.fromEntity(req.getRequester()),
                req.getDepartment().getId(),
                req.getDepartment().getName(),
                req.getVendor().getName(),
                req.getSubmittedAt(),
                req.getAiStatus(),
                ai != null ? ai.getRecommendation() : null,
                ai != null ? ai.getRiskLevel() : null,
                req.getVersion()
        );
    }

    private Sort parseSort(String sortStr) {
        if (sortStr == null || sortStr.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "submittedAt", "createdAt");
        }
        boolean desc = sortStr.startsWith("-");
        String property = desc ? sortStr.substring(1) : sortStr;
        Sort.Direction direction = desc ? Sort.Direction.DESC : Sort.Direction.ASC;
        if ("amount".equals(property)) {
            return Sort.by(direction, "amount");
        }
        return Sort.by(direction, "submittedAt", "createdAt");
    }
}
