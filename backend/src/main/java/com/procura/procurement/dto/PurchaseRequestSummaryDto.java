package com.procura.procurement.dto;

import com.procura.common.enums.AiStatus;
import com.procura.common.enums.Category;
import com.procura.common.enums.Priority;
import com.procura.common.enums.Recommendation;
import com.procura.common.enums.RequestStatus;
import com.procura.common.enums.RiskLevel;
import com.procura.user.dto.UserRefDto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PurchaseRequestSummaryDto(
    String id,
    String title,
    RequestStatus status,
    BigDecimal amount,
    String currency,
    Category category,
    Priority priority,
    UserRefDto requester,
    Long departmentId,
    String departmentName,
    String vendorName,
    OffsetDateTime submittedAt,
    AiStatus aiStatus,
    Recommendation aiRecommendation,
    RiskLevel riskLevel,
    int version
) {}

