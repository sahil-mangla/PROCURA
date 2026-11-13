package com.procura.procurement.dto;

import com.procura.ai.dto.AiAnalysisDto;
import com.procura.budget.dto.BudgetDto;
import com.procura.common.enums.*;
import com.procura.user.dto.UserRefDto;
import com.procura.vendor.dto.VendorDto;
import com.procura.workflow.dto.WorkflowStepDto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record PurchaseRequestDetailDto(
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
    int version,

    // Detail-specific fields
    String description,
    LocalDate neededBy,
    VendorDto vendor,
    List<LineItemDto> items,
    BudgetDto budget,
    AiAnalysisDto aiAnalysis,
    Long openReviewId,
    String purchaseOrderId,
    List<AllowedAction> allowedActions,
    List<WorkflowStepDto> workflowSteps,
    OffsetDateTime createdAt
) {}

