package com.procura.review;

import com.procura.common.dto.PagedResponse;
import com.procura.procurement.dto.PurchaseRequestDetailDto;
import com.procura.review.dto.DecideReviewInput;
import com.procura.review.dto.ReviewDto;
import com.procura.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/reviews", "/reviews"})
@PreAuthorize("hasRole('FINANCE_MANAGER')")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<ReviewDto>> listReviews(
            @RequestParam(required = false, defaultValue = "OPEN") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(reviewService.listReviews(status, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReviewDto> getReview(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.getReview(id));
    }

    @PostMapping("/{id}/decision")
    public ResponseEntity<PurchaseRequestDetailDto> decideReview(
            @PathVariable Long id,
            @Valid @RequestBody DecideReviewInput input,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(reviewService.decideReview(id, input, principal));
    }
}
