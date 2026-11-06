package com.procura.audit.dto;

import com.procura.ai.dto.AiAnalysisDto;
import com.procura.common.enums.HumanDecision;
import com.procura.user.dto.UserRefDto;

import java.time.OffsetDateTime;

public record AiDecisionAuditDto(
    String requestId,
    AiAnalysisDto analysis,
    HumanDecision humanDecision,
    UserRefDto decidedBy,
    OffsetDateTime decidedAt,
    Boolean override,
    String overrideReason
) {}

