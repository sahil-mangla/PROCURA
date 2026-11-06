package com.procura.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProblemResponse(
    String type,
    String title,
    int status,
    String detail,
    ProblemCode code,
    List<FieldErrorItem> errors
) {
    public record FieldErrorItem(String field, String message) {}

    public static ProblemResponse of(ProblemCode code, int status, String title, String detail) {
        return new ProblemResponse(
            "https://procura.local/problems/" + code.name().toLowerCase().replace('_', '-'),
            title,
            status,
            detail,
            code,
            null
        );
    }

    public static ProblemResponse ofValidation(String detail, List<FieldErrorItem> errors) {
        return new ProblemResponse(
            "https://procura.local/problems/validation-failed",
            "Validation failed",
            400,
            detail,
            ProblemCode.VALIDATION_FAILED,
            errors
        );
    }
}

