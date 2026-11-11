package com.procura.ai.dto;

import java.util.List;

public record ReasonDto(
    String code,
    String text,
    String tone,
    List<String> evidenceIds
) {}

