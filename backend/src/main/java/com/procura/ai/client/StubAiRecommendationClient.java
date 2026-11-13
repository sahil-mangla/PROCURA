package com.procura.ai.client;

import com.procura.ai.dto.AgentVersionsDto;
import com.procura.ai.dto.EvidenceDto;
import com.procura.ai.dto.ReasonDto;
import com.procura.ai.dto.ReviewTriggerDto;
import com.procura.common.enums.Recommendation;
import com.procura.common.enums.RiskLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class StubAiRecommendationClient implements AiRecommendationClient {

    private static final Logger log = LoggerFactory.getLogger(StubAiRecommendationClient.class);

    @Override
    public AiClientModels.RecommendationResponse analyze(AiClientModels.AnalysisInput request) {
        log.info("[AI Stub] Analyzing request: {}", request.requestId());

        boolean isHighValue = request.amount() != null && request.amount().compareTo(new BigDecimal("50000")) > 0;
        double confidence = isHighValue ? 0.67 : 0.92;
        RiskLevel risk = isHighValue ? RiskLevel.MEDIUM : RiskLevel.LOW;
        boolean reviewRequired = isHighValue;

        List<ReasonDto> reasons = new ArrayList<>();
        List<ReviewTriggerDto> triggers = new ArrayList<>();
        List<EvidenceDto> evidence = new ArrayList<>();

        if (isHighValue) {
            reasons.add(new ReasonDto("WITHIN_BUDGET", "Within remaining department budget", "SUPPORTS", List.of()));
            reasons.add(new ReasonDto("SIMILAR_MOSTLY_APPROVED", "Similar requests were mostly approved", "SUPPORTS", List.of("PR-1001", "PR-1002")));
            reasons.add(new ReasonDto("AMOUNT_ABOVE_AVERAGE", "Request is 2.3x the department's historical average", "CONCERN", List.of()));

            triggers.add(new ReviewTriggerDto("LOW_CONFIDENCE", "Confidence is 67%, below the 80% threshold", "AI"));
            triggers.add(new ReviewTriggerDto("AMOUNT_ANOMALY", "Amount is significantly higher than historical average", "AI"));

            evidence.add(new EvidenceDto("PR-1001", "Laptops for Engineering Team", new BigDecimal("120000.00"), "APPROVED", 0.88));
            evidence.add(new EvidenceDto("PR-1002", "Cloud Infrastructure Credits", new BigDecimal("80000.00"), "APPROVED", 0.82));
        } else {
            reasons.add(new ReasonDto("WITHIN_BUDGET", "Within remaining department budget", "SUPPORTS", List.of()));
            reasons.add(new ReasonDto("AMOUNT_TYPICAL", "Typical order amount for this department and category", "SUPPORTS", List.of()));
            reasons.add(new ReasonDto("VENDOR_ESTABLISHED", "Vendor has verified history of completed orders", "SUPPORTS", List.of()));

            evidence.add(new EvidenceDto("PR-1001", "Laptops for Engineering Team", new BigDecimal("120000.00"), "APPROVED", 0.90));
        }

        return new AiClientModels.RecommendationResponse(
                request.requestId(),
                Recommendation.APPROVE,
                confidence,
                risk,
                reviewRequired,
                0.80,
                reasons,
                triggers,
                evidence,
                "approval-model-v2",
                new AgentVersionsDto("v1", "v1", "v1"),
                OffsetDateTime.now()
        );
    }

    @Override
    public List<Map<String, Object>> getModelVersions() {
        return List.of(
                Map.of(
                        "version", "approval-model-v2",
                        "algorithm", "logistic_regression",
                        "status", "SERVING",
                        "trainedAt", OffsetDateTime.now().minusDays(30).toString(),
                        "trainingRows", 1250,
                        "metrics", Map.of(
                                "accuracy", 0.91,
                                "precision", 0.89,
                                "recall", 0.93,
                                "f1", 0.91,
                                "rocAuc", 0.94,
                                "brierScore", 0.08,
                                "confusionMatrix", Map.of("tp", 450, "fp", 40, "tn", 510, "fn", 35)
                        )
                )
        );
    }
}

