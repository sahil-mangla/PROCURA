package com.procura.ai.client;

import com.procura.ai.dto.AgentVersionsDto;
import com.procura.ai.dto.EvidenceDto;
import com.procura.ai.dto.ReasonDto;
import com.procura.ai.dto.ReviewTriggerDto;
import com.procura.common.enums.Category;
import com.procura.common.enums.Priority;
import com.procura.common.enums.Recommendation;
import com.procura.common.enums.RiskLevel;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public class AiClientModels {

    public record AnalysisInput(
        String requestId,
        Long departmentId,
        BigDecimal amount,
        String currency,
        Category category,
        Priority priority,
        Long vendorId,
        BigDecimal budgetTotal,
        BigDecimal budgetRemaining,
        String title,
        String requestDescription,
        OffsetDateTime submittedAt,
        List<ItemInput> items
    ) {
        public record ItemInput(String description, int quantity, BigDecimal unitPrice) {}
    }

    public record RecommendationResponse(
        String requestId,
        Recommendation recommendation,
        double confidence,
        RiskLevel riskLevel,
        boolean requiresHumanReview,
        double reviewThreshold,
        List<ReasonDto> reasons,
        List<ReviewTriggerDto> reviewTriggers,
        List<EvidenceDto> evidence,
        String modelVersion,
        AgentVersionsDto agentVersions,
        OffsetDateTime analysedAt
    ) {}
}

