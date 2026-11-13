package com.procura.workflow.dto;

import com.procura.common.enums.WorkflowStepKey;
import com.procura.common.enums.WorkflowStepState;
import com.procura.user.dto.UserRefDto;

import java.time.OffsetDateTime;

public record WorkflowStepDto(
    WorkflowStepKey key,
    String label,
    WorkflowStepState state,
    UserRefDto actor,
    OffsetDateTime at
) {}

