package com.procura.ai.dto;

import java.math.BigDecimal;

public record EvidenceDto(
    String requestId,
    String summary,
    BigDecimal amount,
    String outcome,
    Double similarity
) {}

