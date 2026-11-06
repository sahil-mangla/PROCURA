package com.procura.ai.dto;

public record ReviewTriggerDto(
    String code,
    String text,
    String source
) {
    public static ReviewTriggerDto ai(String code, String text) {
        return new ReviewTriggerDto(code, text, "AI");
    }

    public static ReviewTriggerDto rule(String code, String text) {
        return new ReviewTriggerDto(code, text, "RULE");
    }
}

