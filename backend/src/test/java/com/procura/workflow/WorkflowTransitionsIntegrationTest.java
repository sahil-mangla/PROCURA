package com.procura.workflow;

import com.procura.BaseIntegrationTest;
import com.procura.budget.Budget;
import com.procura.budget.BudgetRepository;
import com.procura.common.enums.Category;
import com.procura.common.enums.HumanDecision;
import com.procura.common.enums.Priority;
import com.procura.procurement.dto.LineItemDto;
import com.procura.procurement.dto.PurchaseRequestInputDto;
import com.procura.review.dto.DecideReviewInput;
import com.procura.vendor.Vendor;
import com.procura.vendor.VendorRepository;
import com.procura.workflow.dto.ActionDtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WorkflowTransitionsIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private BudgetRepository budgetRepository;

    private Vendor vendor;
    private Budget budget;

    @BeforeEach
    void setupWorkflowData() {
        if (vendor == null) {
            vendor = vendorRepository.searchVendors("Hardware Prime").stream().findFirst().orElseGet(() -> {
                Vendor v = new Vendor();
                v.setName("Hardware Prime");
                v.setEmail("sales@hwprime.example.com");
                return vendorRepository.save(v);
            });
        }

        budget = budgetRepository.findByDepartmentIdAndFiscalYear(engineeringDept.getId(), "2026-27").orElseGet(() -> {
            Budget b = new Budget();
            b.setDepartment(engineeringDept);
            b.setFiscalYear("2026-27");
            return b;
        });
        budget.setTotal(new BigDecimal("1000000.00"));
        budget.setSpent(BigDecimal.ZERO);
        budget.setCommitted(BigDecimal.ZERO);
        budget.setCurrency("INR");
        budget = budgetRepository.save(budget);
    }

    private String createRequest(BigDecimal amount) throws Exception {
        PurchaseRequestInputDto input = new PurchaseRequestInputDto(
                "Test Procurement Request",
                "Description",
                Category.IT_EQUIPMENT,
                Priority.NORMAL,
                vendor.getId(),
                LocalDate.now().plusDays(10),
                List.of(new LineItemDto(null, "Test Item", 1, amount, null)),
                null
        );

        String res = mockMvc.perform(post("/api/purchase-requests")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(res).get("id").asText();
    }

    @Test
    @DisplayName("Complete Standard Workflow: T1(Submit) -> T2(Dept Approve) -> T7(Finance Approve) -> T12(PO Generated)")
    void testStandardLowValueWorkflow() throws Exception {
        // 1. Create draft <= 50,000
        String prId = createRequest(new BigDecimal("35000.00"));

        // 2. T1: Requester Submits (version: 0)
        ActionDtos.VersionedAction submitAction = new ActionDtos.VersionedAction(0);
        String submitRes = mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitAction)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUBMITTED")))
                .andExpect(jsonPath("$.version", is(1)))
                .andReturn().getResponse().getContentAsString();

        waitForAiAnalysis(prId);
        int currentVersion = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();

        // 3. T2: Department Head Approves (amount 35,000 <= 50,000 -> DEPARTMENT_APPROVED)
        ActionDtos.DecisionAction deptApprove = new ActionDtos.DecisionAction(currentVersion, "Approved by Dept Head");
        String deptRes = mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deptApprove)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DEPARTMENT_APPROVED")))
                .andExpect(jsonPath("$.version", is(currentVersion + 1)))
                .andReturn().getResponse().getContentAsString();

        int versionAfterDept = objectMapper.readTree(deptRes).get("version").asInt();

        // 4. T7: Finance Manager Approves -> triggers automatic PO generation (T12)
        ActionDtos.DecisionAction financeApprove = new ActionDtos.DecisionAction(versionAfterDept, "Finance approved");
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + financeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(financeApprove)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("PO_GENERATED")))
                .andExpect(jsonPath("$.purchaseOrderId", notNullValue()));
    }

    @Test
    @DisplayName("Human Review Workflow: T1(Submit) -> T3(High Value -> HUMAN_REVIEW) -> T9(Finance Review Approve) -> PO_GENERATED")
    void testHighValueHumanReviewWorkflow() throws Exception {
        // 1. Create draft > 50,000 (e.g. 75,000)
        String prId = createRequest(new BigDecimal("75000.00"));

        // 2. Submit
        ActionDtos.VersionedAction submitAction = new ActionDtos.VersionedAction(0);
        String submitRes = mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitAction)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        waitForAiAnalysis(prId);
        int currentVersion = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();

        // 3. Dept Head Approves -> triggers T3 (HUMAN_REVIEW)
        ActionDtos.DecisionAction deptApprove = new ActionDtos.DecisionAction(currentVersion, "Dept head approves high value");
        String deptRes = mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deptApprove)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("HUMAN_REVIEW")))
                .andExpect(jsonPath("$.openReviewId", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        long reviewId = objectMapper.readTree(deptRes).get("openReviewId").asLong();
        int version2 = objectMapper.readTree(deptRes).get("version").asInt();

        // 4. Finance Manager decides Review (T9: APPROVE) -> PO_GENERATED
        DecideReviewInput reviewInput = new DecideReviewInput(version2, HumanDecision.APPROVE, "Human review cleared by finance");
        mockMvc.perform(post("/api/reviews/" + reviewId + "/decision")
                        .header("Authorization", "Bearer " + financeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewInput)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("PO_GENERATED")))
                .andExpect(jsonPath("$.openReviewId", nullValue()))
                .andExpect(jsonPath("$.purchaseOrderId", notNullValue()));
    }

    @Test
    @DisplayName("Self-Approval Restriction: Requester cannot approve their own request (403 FORBIDDEN)")
    void testSelfApprovalPrevention() throws Exception {
        String prId = createRequest(new BigDecimal("20000.00"));

        // Submit
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(0))))
                .andExpect(status().isOk());

        // Requester tries to approve own request
        ActionDtos.DecisionAction selfApprove = new ActionDtos.DecisionAction(1, "Self approving");
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(selfApprove)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("FORBIDDEN")));
    }

    @Test
    @DisplayName("Optimistic Locking: Stale version decision returns 409 WORKFLOW_CONFLICT")
    void testStaleVersionConflict() throws Exception {
        String prId = createRequest(new BigDecimal("15000.00"));

        // Submit (version becomes 1)
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(0))))
                .andExpect(status().isOk());

        // Stale decision with version 0 instead of 1
        ActionDtos.DecisionAction staleAction = new ActionDtos.DecisionAction(0, "Stale version action");
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staleAction)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("WORKFLOW_CONFLICT")));
    }

    @Test
    @DisplayName("Rejection requires comment: Rejecting without comment returns 400 VALIDATION_FAILED")
    void testRejectCommentRequired() throws Exception {
        String prId = createRequest(new BigDecimal("15000.00"));

        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(0))))
                .andExpect(status().isOk());

        // Reject with empty comment
        ActionDtos.DecisionActionCommentRequired emptyReject = new ActionDtos.DecisionActionCommentRequired(1, "");
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/reject")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyReject)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")));
    }
}
