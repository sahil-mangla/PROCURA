package com.procura.notification.dto;

import com.procura.common.enums.HumanDecision;
import com.procura.common.enums.Recommendation;
import com.procura.notification.Notification;

import java.time.OffsetDateTime;
import java.util.List;

public record NotificationDto(
    Long id,
    String event,
    String requestId,
    String message,
    boolean override,
    Recommendation aiRecommendation,
    HumanDecision humanDecision,
    boolean read,
    OffsetDateTime createdAt
) {
    public static NotificationDto fromEntity(Notification n) {
        if (n == null) return null;
        Recommendation aiRec = n.getAiRecommendation() != null ? Recommendation.valueOf(n.getAiRecommendation()) : null;
        HumanDecision humanDec = n.getHumanDecision() != null ? HumanDecision.valueOf(n.getHumanDecision()) : null;

        return new NotificationDto(
            n.getId(),
            n.getEvent(),
            n.getRequestId(),
            n.getMessage(),
            n.isOverride(),
            aiRec,
            humanDec,
            n.isRead(),
            n.getCreatedAt()
        );
    }

    public record NotificationListResponse(
        int page,
        int size,
        long totalItems,
        long unreadCount,
        List<NotificationDto> items
    ) {}
}

