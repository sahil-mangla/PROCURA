package com.procura.ai.dto;

import com.procura.common.enums.Category;
import com.procura.common.enums.Priority;
import com.procura.common.enums.Recommendation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public class InternalAiExportDtos {

    public record HistoricalRequestDto(
        String requestId,
        String title,
        String description,
        Long departmentId,
        Category category,
        Priority priority,
        BigDecimal amount,
        String currency,
        Long vendorId,
        Integer itemCount,
        OffsetDateTime submittedAt,
        BigDecimal budgetTotalAtSubmit,
        BigDecimal budgetRemainingAtSubmit,
        String outcome, // APPROVED or REJECTED
        String rejectedAtStage, // DEPARTMENT, FINANCE, REVIEW, null
        OffsetDateTime updatedAt
    ) {}

    public record HistoricalRequestExportResponse(
        String nextCursor,
        List<HistoricalRequestDto> items
    ) {}

    public record OutcomeDto(
        String requestId,
        Long analysisId,
        String modelVersion,
        Recommendation aiRecommendation,
        Double aiConfidence,
        String finalOutcome, // APPROVED or REJECTED
        boolean override,
        String overrideReason,
        OffsetDateTime decidedAt
    ) {}

    public record OutcomeExportResponse(
        String nextCursor,
        List<OutcomeDto> items
    ) {}
}

