package com.procura.budget;

import com.procura.budget.dto.BudgetDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/budgets", "/budgets"})
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @GetMapping
    public ResponseEntity<List<BudgetDto>> listBudgets(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String fiscalYear
    ) {
        return ResponseEntity.ok(budgetService.listBudgets(departmentId, fiscalYear));
    }
}
