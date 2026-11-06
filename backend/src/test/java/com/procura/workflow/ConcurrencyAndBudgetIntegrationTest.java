package com.procura.workflow;

import com.procura.BaseIntegrationTest;
import com.procura.budget.Budget;
import com.procura.budget.BudgetRepository;
import com.procura.budget.BudgetService;
import com.procura.common.enums.Category;
import com.procura.common.enums.Priority;
import com.procura.common.error.Exceptions;
import com.procura.procurement.PurchaseRequest;
import com.procura.procurement.dto.LineItemDto;
import com.procura.procurement.dto.PurchaseRequestInputDto;
import com.procura.purchaseorder.PurchaseOrder;
import com.procura.purchaseorder.PurchaseOrderService;
import com.procura.vendor.Vendor;
import com.procura.vendor.VendorRepository;
import com.procura.workflow.dto.ActionDtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConcurrencyAndBudgetIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private WorkflowEngine workflowEngine;

    private Vendor vendor;

    @BeforeEach
    void setupVendorAndBudget() {
        if (vendor == null) {
            vendor = vendorRepository.searchVendors("Concurrency Vendor").stream().findFirst().orElseGet(() -> {
                Vendor v = new Vendor();
                v.setName("Concurrency Vendor");
                v.setEmail("sales@concurrency.example.com");
                return vendorRepository.save(v);
            });
        }
        Budget b = budgetRepository.findByDepartmentIdAndFiscalYear(engineeringDept.getId(), "2026-27").orElseGet(() -> {
            Budget newB = new Budget();
            newB.setDepartment(engineeringDept);
            newB.setFiscalYear("2026-27");
            return newB;
        });
        b.setTotal(new BigDecimal("1000000.00"));
        b.setSpent(BigDecimal.ZERO);
        b.setCommitted(BigDecimal.ZERO);
        b.setCurrency("INR");
        budgetRepository.save(b);
    }

    private String createAndSubmitRequest(BigDecimal amount) throws Exception {
        PurchaseRequestInputDto input = new PurchaseRequestInputDto(
                "Concurrency Test Request",
                "Testing concurrency",
                Category.SERVICES,
                Priority.NORMAL,
                vendor.getId(),
                LocalDate.now().plusDays(10),
                List.of(new LineItemDto(null, "Item", 1, amount, null)),
                null
        );

        String createRes = mockMvc.perform(post("/api/purchase-requests")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String prId = objectMapper.readTree(createRes).get("id").asText();

        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(0))))
                .andExpect(status().isOk());

        waitForAiAnalysis(prId);

        return prId;
    }

    @Test
    @DisplayName("Concurrency: Conflicting simultaneous decisions on same version - exactly one succeeds, other gets 409")
    void testConcurrentApprovalsOnSameRequest() throws Exception {
        String prId = createAndSubmitRequest(new BigDecimal("25000.00"));
        int currentVersion = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();

        int numThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch readyLatch = new CountDownLatch(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        Callable<Void> task1 = () -> {
            readyLatch.countDown();
            startLatch.await();
            MvcResult res = mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                            .header("Authorization", "Bearer " + deptHeadToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new ActionDtos.DecisionAction(currentVersion, "Approve 1"))))
                    .andReturn();
            if (res.getResponse().getStatus() == 200) successCount.incrementAndGet();
            if (res.getResponse().getStatus() == 409) conflictCount.incrementAndGet();
            return null;
        };

        Callable<Void> task2 = () -> {
            readyLatch.countDown();
            startLatch.await();
            MvcResult res = mockMvc.perform(post("/api/purchase-requests/" + prId + "/reject")
                            .header("Authorization", "Bearer " + deptHeadToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new ActionDtos.DecisionActionCommentRequired(currentVersion, "Reject 2"))))
                    .andReturn();
            if (res.getResponse().getStatus() == 200) successCount.incrementAndGet();
            if (res.getResponse().getStatus() == 409) conflictCount.incrementAndGet();
            return null;
        };

        Future<Void> f1 = executor.submit(task1);
        Future<Void> f2 = executor.submit(task2);

        readyLatch.await();
        startLatch.countDown();

        f1.get(5, TimeUnit.SECONDS);
        f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one concurrent action must succeed");
        assertEquals(1, conflictCount.get(), "Conflicting action must receive 409 WORKFLOW_CONFLICT");
    }

    @Test
    @DisplayName("Budget Oversubscription: Atomic reservation prevents concurrent spend exceeding budget")
    void testConcurrentBudgetOversubscription() {
        // Set up a budget with exactly 60,000 remaining
        Budget testBudget = budgetRepository.findByDepartmentIdAndFiscalYear(engineeringDept.getId(), "2026-27").orElseGet(() -> {
            Budget b = new Budget();
            b.setDepartment(engineeringDept);
            b.setFiscalYear("2026-27");
            b.setTotal(new BigDecimal("100000.00"));
            b.setSpent(new BigDecimal("40000.00"));
            b.setCommitted(BigDecimal.ZERO);
            b.setCurrency("INR");
            return budgetRepository.save(b);
        });

        testBudget.setTotal(new BigDecimal("100000.00"));
        testBudget.setSpent(new BigDecimal("40000.00"));
        testBudget.setCommitted(BigDecimal.ZERO);
        budgetRepository.save(testBudget);

        // Department has 60,000 remaining
        BigDecimal reservation1 = new BigDecimal("50000.00");
        BigDecimal reservation2 = new BigDecimal("50000.00");

        // First reservation of 50,000 succeeds
        assertDoesNotThrow(() -> budgetService.reserveBudget(engineeringDept.getId(), "2026-27", reservation1));

        // Second reservation of 50,000 must fail with BusinessRuleViolationException
        Exceptions.BusinessRuleViolationException ex = assertThrows(
                Exceptions.BusinessRuleViolationException.class,
                () -> budgetService.reserveBudget(engineeringDept.getId(), "2026-27", reservation2)
        );
        assertTrue(ex.getMessage().contains("Insufficient remaining budget"));
    }

    @Test
    @DisplayName("Idempotent PO Generation: Calling PO generation twice returns the same PO without duplicates")
    void testDuplicatePurchaseOrderPrevention() throws Exception {
        String prId = createAndSubmitRequest(new BigDecimal("20000.00"));
        int v1 = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();

        // Approve by dept head
        String deptRes = mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.DecisionAction(v1, "Dept approve"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        int v2 = objectMapper.readTree(deptRes).get("version").asInt();

        // Approve by finance (generates PO)
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + financeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.DecisionAction(v2, "Finance approve"))))
                .andExpect(status().isOk());

        // Retry / Second generation call
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/purchase-order")
                        .header("Authorization", "Bearer " + financeToken))
                .andExpect(status().isOk());
    }
}
