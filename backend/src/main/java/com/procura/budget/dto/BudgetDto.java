package com.procura.budget.dto;

import com.procura.budget.Budget;
import java.math.BigDecimal;

public record BudgetDto(
    Long departmentId,
    String fiscalYear,
    BigDecimal total,
    BigDecimal spent,
    BigDecimal committed,
    BigDecimal remaining,
    String currency
) {
    public static BudgetDto fromEntity(Budget budget) {
        if (budget == null) return null;
        return new BudgetDto(
            budget.getDepartment().getId(),
            budget.getFiscalYear(),
            budget.getTotal(),
            budget.getSpent(),
            budget.getCommitted(),
            budget.getRemaining(),
            budget.getCurrency()
        );
    }
}

