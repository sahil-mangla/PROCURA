package com.procura.review;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.common.dto.PagedResponse;
import com.procura.common.error.Exceptions;
import com.procura.procurement.PurchaseRequest;
import com.procura.procurement.PurchaseRequestService;
import com.procura.procurement.dto.PurchaseRequestDetailDto;
import com.procura.review.dto.DecideReviewInput;
import com.procura.review.dto.ReviewDto;
import com.procura.security.UserPrincipal;
import com.procura.workflow.WorkflowEngine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReviewService {

    private final HumanReviewRepository reviewRepository;
    private final WorkflowEngine workflowEngine;
    private final PurchaseRequestService purchaseRequestService;
    private final ObjectMapper objectMapper;

    public ReviewService(
            HumanReviewRepository reviewRepository,
            WorkflowEngine workflowEngine,
            PurchaseRequestService purchaseRequestService,
            ObjectMapper objectMapper) {
        this.reviewRepository = reviewRepository;
        this.workflowEngine = workflowEngine;
        this.purchaseRequestService = purchaseRequestService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReviewDto> listReviews(String status, int page, int size) {
        String filterStatus = (status == null || status.isBlank()) ? "OPEN" : status.toUpperCase();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<HumanReview> reviewPage = reviewRepository.findByStatus(filterStatus, pageable);

        List<ReviewDto> items = reviewPage.getContent().stream()
                .map(r -> ReviewDto.fromEntity(r, objectMapper))
                .toList();

        return PagedResponse.of(page, size, reviewPage.getTotalElements(), items);
    }

    @Transactional(readOnly = true)
    public ReviewDto getReview(Long id) {
        HumanReview review = reviewRepository.findById(id)
                .orElseThrow(() -> new Exceptions.NotFoundException("Review task not found with id: " + id));
        return ReviewDto.fromEntity(review, objectMapper);
    }

    @Transactional
    public PurchaseRequestDetailDto decideReview(Long id, DecideReviewInput input, UserPrincipal actor) {
        PurchaseRequest updated = workflowEngine.decideReview(id, input.version(), input.decision(), input.comment(), actor);
        return purchaseRequestService.getRequestDetail(updated.getId(), actor);
    }
}

