package com.procura.review.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.ai.dto.ReviewTriggerDto;
import com.procura.common.enums.HumanDecision;
import com.procura.common.enums.Recommendation;
import com.procura.review.HumanReview;
import com.procura.user.dto.UserRefDto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

public record ReviewDto(
    Long id,
    String requestId,
    String requestTitle,
    BigDecimal amount,
    String status,
    List<ReviewTriggerDto> triggers,
    Recommendation aiRecommendation,
    Double aiConfidence,
    OffsetDateTime createdAt,
    HumanDecision decision,
    UserRefDto decidedBy,
    OffsetDateTime decidedAt,
    Boolean override,
    String comment
) {
    public static ReviewDto fromEntity(HumanReview review, ObjectMapper mapper) {
        if (review == null) return null;
        List<ReviewTriggerDto> triggers;
        try {
            triggers = review.getTriggersJson() != null ?
                    mapper.readValue(review.getTriggersJson(), new TypeReference<List<ReviewTriggerDto>>() {}) : Collections.emptyList();
        } catch (Exception e) {
            triggers = Collections.emptyList();
        }

        return new ReviewDto(
            review.getId(),
            review.getRequestId(),
            review.getRequestTitle(),
            review.getAmount(),
            review.getStatus(),
            triggers,
            review.getAiRecommendation(),
            review.getAiConfidence(),
            review.getCreatedAt(),
            review.getDecision(),
            UserRefDto.fromEntity(review.getDecidedBy()),
            review.getDecidedAt(),
            review.getOverride(),
            review.getComment()
        );
    }
}

