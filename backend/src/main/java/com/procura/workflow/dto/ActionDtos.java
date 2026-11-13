package com.procura.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ActionDtos {

    public record VersionedAction(
        @NotNull(message = "Version is required")
        Integer version
    ) {}

    public record DecisionAction(
        @NotNull(message = "Version is required")
        Integer version,

        @Size(max = 2000, message = "Comment must not exceed 2000 characters")
        String comment
    ) {}

    public record DecisionActionCommentRequired(
        @NotNull(message = "Version is required")
        Integer version,

        @NotBlank(message = "Comment is required")
        @Size(min = 1, max = 2000, message = "Comment must be between 1 and 2000 characters")
        String comment
    ) {}
}

