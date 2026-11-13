package com.procura.audit.dto;

import com.procura.audit.ApprovalHistory;
import com.procura.common.enums.*;
import com.procura.user.dto.UserRefDto;

import java.time.OffsetDateTime;

public record HistoryEntryDto(
    Long id,
    OffsetDateTime at,
    HistoryEvent event,
    ActorType actorType,
    UserRefDto actor,
    String modelVersion,
    Long analysisId,
    RequestStatus fromStatus,
    RequestStatus toStatus,
    HumanDecision decision,
    Recommendation aiRecommendation,
    boolean override,
    String comment
) {
    public static HistoryEntryDto fromEntity(ApprovalHistory history) {
        if (history == null) return null;
        return new HistoryEntryDto(
            history.getId(),
            history.getCreatedAt(),
            history.getEvent(),
            history.getActorType(),
            UserRefDto.fromEntity(history.getActor()),
            history.getModelVersion(),
            history.getAnalysisId(),
            history.getFromStatus(),
            history.getToStatus(),
            history.getDecision(),
            history.getAiRecommendation(),
            history.isOverride(),
            history.getComment()
        );
    }
}

