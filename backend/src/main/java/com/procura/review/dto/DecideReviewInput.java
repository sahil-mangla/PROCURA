package com.procura.review.dto;

import com.procura.common.enums.HumanDecision;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DecideReviewInput(
    @NotNull(message = "Version is required")
    Integer version,

    @NotNull(message = "Decision is required")
    HumanDecision decision,

    @Size(max = 2000, message = "Comment must not exceed 2000 characters")
    String comment
) {}

