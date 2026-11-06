package com.procura.budget;

import com.procura.budget.dto.BudgetDto;
import com.procura.common.error.Exceptions;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;

    public BudgetService(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    @Transactional(readOnly = true)
    public List<BudgetDto> listBudgets(Long departmentId, String fiscalYear) {
        return budgetRepository.findByFilters(departmentId, fiscalYear).stream()
                .map(BudgetDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<BudgetDto> getDepartmentBudget(Long departmentId, String fiscalYear) {
        return budgetRepository.findByDepartmentIdAndFiscalYear(departmentId, fiscalYear)
                .map(BudgetDto::fromEntity);
    }

    /**
     * Atomically reserves budget amount upon finance approval.
     * Uses pessimistic write lock on the budget row to prevent concurrent oversubscription.
     */
    @Transactional
    public void reserveBudget(Long departmentId, String fiscalYear, BigDecimal amount) {
        Budget budget = budgetRepository.findWithLockByDepartmentIdAndFiscalYear(departmentId, fiscalYear)
                .orElseThrow(() -> new Exceptions.NotFoundException("Budget not found for department " + departmentId + " and fiscal year " + fiscalYear));

        BigDecimal remaining = budget.getRemaining();
        if (remaining.compareTo(amount) < 0) {
            throw new Exceptions.BusinessRuleViolationException(
                    "Insufficient remaining budget. Remaining: " + remaining + ", Requested: " + amount
            );
        }

        budget.setCommitted(budget.getCommitted().add(amount));
        budgetRepository.save(budget);
    }

    /**
     * Moves committed budget into spent when Purchase Order is generated.
     */
    @Transactional
    public void recordPurchaseOrderIssued(Long departmentId, String fiscalYear, BigDecimal amount) {
        Budget budget = budgetRepository.findWithLockByDepartmentIdAndFiscalYear(departmentId, fiscalYear)
                .orElseThrow(() -> new Exceptions.NotFoundException("Budget not found for department " + departmentId + " and fiscal year " + fiscalYear));

        budget.setCommitted(budget.getCommitted().subtract(amount).max(BigDecimal.ZERO));
        budget.setSpent(budget.getSpent().add(amount));
        budgetRepository.save(budget);
    }
}

