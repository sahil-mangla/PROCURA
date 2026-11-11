package com.procura.ai.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.ai.AiAnalysisEntity;
import com.procura.common.enums.Recommendation;
import com.procura.common.enums.RiskLevel;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

public record AiAnalysisDto(
    Long id,
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
    OffsetDateTime analysedAt,
    boolean evidenceRejected
) {
    public static AiAnalysisDto fromEntity(AiAnalysisEntity entity, ObjectMapper mapper) {
        if (entity == null) return null;
        try {
            List<ReasonDto> reasons = entity.getReasonsJson() != null ?
                    mapper.readValue(entity.getReasonsJson(), new TypeReference<List<ReasonDto>>() {}) : Collections.emptyList();
            List<ReviewTriggerDto> triggers = entity.getReviewTriggersJson() != null ?
                    mapper.readValue(entity.getReviewTriggersJson(), new TypeReference<List<ReviewTriggerDto>>() {}) : Collections.emptyList();
            List<EvidenceDto> evidence = entity.getEvidenceJson() != null ?
                    mapper.readValue(entity.getEvidenceJson(), new TypeReference<List<EvidenceDto>>() {}) : Collections.emptyList();
            AgentVersionsDto agents = entity.getAgentVersionsJson() != null ?
                    mapper.readValue(entity.getAgentVersionsJson(), AgentVersionsDto.class) : new AgentVersionsDto("v1", "v1", "v1");

            return new AiAnalysisDto(
                entity.getId(),
                entity.getRequestId(),
                entity.getRecommendation(),
                entity.getConfidence(),
                entity.getRiskLevel(),
                entity.isRequiresHumanReview(),
                entity.getReviewThreshold(),
                reasons,
                triggers,
                evidence,
                entity.getModelVersion(),
                agents,
                entity.getAnalysedAt(),
                entity.isEvidenceRejected()
            );
        } catch (Exception e) {
            return new AiAnalysisDto(
                entity.getId(),
                entity.getRequestId(),
                entity.getRecommendation(),
                entity.getConfidence(),
                entity.getRiskLevel(),
                entity.isRequiresHumanReview(),
                entity.getReviewThreshold(),
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList(),
                entity.getModelVersion(),
                new AgentVersionsDto("v1", "v1", "v1"),
                entity.getAnalysedAt(),
                entity.isEvidenceRejected()
            );
        }
    }
}

