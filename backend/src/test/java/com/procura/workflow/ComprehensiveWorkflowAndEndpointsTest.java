package com.procura.workflow;

import com.procura.BaseIntegrationTest;
import com.procura.common.enums.*;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class ComprehensiveWorkflowAndEndpointsTest extends BaseIntegrationTest {

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private com.procura.budget.BudgetRepository budgetRepository;

    private Vendor vendor;

    @BeforeEach
    void setupVendorAndBudget() {
        if (vendor == null) {
            vendor = vendorRepository.searchVendors("Endpoints Test Vendor").stream().findFirst().orElseGet(() -> {
                Vendor v = new Vendor();
                v.setName("Endpoints Test Vendor");
                v.setEmail("sales@endpoints.example.com");
                return vendorRepository.save(v);
            });
        }
        budgetRepository.findByDepartmentIdAndFiscalYear(engineeringDept.getId(), "2026-27").orElseGet(() -> {
            var b = new com.procura.budget.Budget();
            b.setDepartment(engineeringDept);
            b.setFiscalYear("2026-27");
            b.setTotal(new BigDecimal("1000000.00"));
            b.setSpent(BigDecimal.ZERO);
            b.setCommitted(BigDecimal.ZERO);
            b.setCurrency("INR");
            return budgetRepository.save(b);
        });
    }

    private String createDraft(BigDecimal amount) throws Exception {
        PurchaseRequestInputDto input = new PurchaseRequestInputDto(
                "Comprehensive Test PR",
                "Testing workflow endpoints",
                Category.SOFTWARE,
                Priority.NORMAL,
                vendor.getId(),
                LocalDate.now().plusDays(15),
                List.of(new LineItemDto(null, "Software License", 1, amount, null)),
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
    @DisplayName("T4: Department Head Rejects Request (requires comment)")
    void testDepartmentHeadRejectWorkflow() throws Exception {
        String prId = createDraft(new BigDecimal("15000.00"));

        // Submit
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(0))))
                .andExpect(status().isOk());

        waitForAiAnalysis(prId);
        int v = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();

        // Reject without comment -> 400 VALIDATION_FAILED
        ActionDtos.DecisionActionCommentRequired noComment = new ActionDtos.DecisionActionCommentRequired(v, "");
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/reject")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noComment)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")));

        // Reject with comment -> 200 OK, status = REJECTED, rejectedAtStage = DEPARTMENT
        ActionDtos.DecisionActionCommentRequired validReject = new ActionDtos.DecisionActionCommentRequired(v, "Not within departmental scope");
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/reject")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReject)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("REJECTED")));
    }

    @Test
    @DisplayName("T5 & T6: Department Head Requests Info, Requester Resubmits")
    void testInfoRequestedAndResubmitWorkflow() throws Exception {
        String prId = createDraft(new BigDecimal("18000.00"));

        // Submit
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(0))))
                .andExpect(status().isOk());

        waitForAiAnalysis(prId);
        int v = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();

        // T5: Dept Head requests information
        ActionDtos.DecisionActionCommentRequired infoRequest = new ActionDtos.DecisionActionCommentRequired(v, "Please provide the quote comparison");
        String infoRes = mockMvc.perform(post("/api/purchase-requests/" + prId + "/request-information")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(infoRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("INFO_REQUESTED")))
                .andReturn().getResponse().getContentAsString();

        int vAfterInfo = objectMapper.readTree(infoRes).get("version").asInt();

        // T6: Requester edits draft while in INFO_REQUESTED
        PurchaseRequestInputDto updateInput = new PurchaseRequestInputDto(
                "Comprehensive Test PR (Updated)",
                "Added quotes",
                Category.SOFTWARE,
                Priority.NORMAL,
                vendor.getId(),
                LocalDate.now().plusDays(20),
                List.of(new LineItemDto(null, "Software License with Support", 1, new BigDecimal("18000.00"), null)),
                null
        );

        mockMvc.perform(put("/api/purchase-requests/" + prId)
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateInput)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Comprehensive Test PR (Updated)")));

        // T6: Requester Resubmits
        int vBeforeResubmit = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(vBeforeResubmit))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUBMITTED")));
    }

    @Test
    @DisplayName("T8: Finance Manager Rejects Request after Department Approval")
    void testFinanceRejectWorkflow() throws Exception {
        String prId = createDraft(new BigDecimal("22000.00"));

        // Submit
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(0))))
                .andExpect(status().isOk());

        waitForAiAnalysis(prId);
        int v1 = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();

        // Dept Head Approves
        String deptRes = mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.DecisionAction(v1, "Dept ok"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DEPARTMENT_APPROVED")))
                .andReturn().getResponse().getContentAsString();

        int v2 = objectMapper.readTree(deptRes).get("version").asInt();

        // Finance Rejects
        ActionDtos.DecisionActionCommentRequired financeReject = new ActionDtos.DecisionActionCommentRequired(v2, "Budget allocated to higher priority project");
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/reject")
                        .header("Authorization", "Bearer " + financeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(financeReject)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("REJECTED")));
    }

    @Test
    @DisplayName("T10: Human Review Reject Decision")
    void testHumanReviewRejectWorkflow() throws Exception {
        String prId = createDraft(new BigDecimal("80000.00")); // > 50,000 threshold

        // Submit
        mockMvc.perform(post("/api/purchase-requests/" + prId + "/submit")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.VersionedAction(0))))
                .andExpect(status().isOk());

        waitForAiAnalysis(prId);
        int v1 = purchaseRequestRepository.findById(prId).orElseThrow().getVersion();

        // Dept Head Approves -> HUMAN_REVIEW
        String deptRes = mockMvc.perform(post("/api/purchase-requests/" + prId + "/approve")
                        .header("Authorization", "Bearer " + deptHeadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ActionDtos.DecisionAction(v1, "Dept ok"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("HUMAN_REVIEW")))
                .andReturn().getResponse().getContentAsString();

        long reviewId = objectMapper.readTree(deptRes).get("openReviewId").asLong();
        int v2 = objectMapper.readTree(deptRes).get("version").asInt();

        // Finance Review Decides REJECT
        DecideReviewInput rejectDecision = new DecideReviewInput(v2, HumanDecision.REJECT, "Excessive cost for current quarter");
        mockMvc.perform(post("/api/reviews/" + reviewId + "/decision")
                        .header("Authorization", "Bearer " + financeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectDecision)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("REJECTED")));
    }

    @Test
    @DisplayName("Reference Data Endpoints: Departments, Users, Vendors, Budgets, Notifications")
    void testReferenceDataEndpoints() throws Exception {
        // Departments
        mockMvc.perform(get("/api/departments")
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())));

        // Users: Admin can list, Requester gets 403
        mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("FORBIDDEN")));

        mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", not(empty())));

        // Vendors
        mockMvc.perform(get("/api/vendors")
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())));

        // Budgets
        mockMvc.perform(get("/api/budgets")
                        .header("Authorization", "Bearer " + financeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())));

        // Notifications: List current user notifications
        String notifRes = mockMvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        var notifTree = objectMapper.readTree(notifRes);
        if (notifTree.get("items").size() > 0) {
            long notifId = notifTree.get("items").get(0).get("id").asLong();
            mockMvc.perform(post("/api/notifications/" + notifId + "/read")
                            .header("Authorization", "Bearer " + requesterToken))
                    .andExpect(status().isNoContent());
        }
    }
}
