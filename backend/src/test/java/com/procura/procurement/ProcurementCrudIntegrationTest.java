package com.procura.procurement;

import com.procura.BaseIntegrationTest;
import com.procura.common.enums.Category;
import com.procura.common.enums.Priority;
import com.procura.procurement.dto.LineItemDto;
import com.procura.procurement.dto.PurchaseRequestInputDto;
import com.procura.vendor.Vendor;
import com.procura.vendor.VendorRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProcurementCrudIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private VendorRepository vendorRepository;

    private Vendor testVendor;

    @BeforeEach
    void setupVendor() {
        if (testVendor == null) {
            testVendor = vendorRepository.searchVendors("Acme Corp").stream().findFirst().orElseGet(() -> {
                Vendor v = new Vendor();
                v.setName("Acme Corp");
                v.setEmail("sales@acme.example.com");
                return vendorRepository.save(v);
            });
        }
    }

    @Test
    @DisplayName("POST /api/purchase-requests should create a draft and calculate line totals correctly")
    void testCreateDraftSuccess() throws Exception {
        List<LineItemDto> items = List.of(
                new LineItemDto(null, "Dell Monitor 27-inch", 2, new BigDecimal("25000.00"), null),
                new LineItemDto(null, "USB-C Hub", 3, new BigDecimal("3000.00"), null)
        );

        PurchaseRequestInputDto input = new PurchaseRequestInputDto(
                "Developer Hardware Setup",
                "New setup for engineering team",
                Category.IT_EQUIPMENT,
                Priority.HIGH,
                testVendor.getId(),
                LocalDate.now().plusDays(14),
                items,
                null
        );

        mockMvc.perform(post("/api/purchase-requests")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", matchesPattern("^PR-\\d{4,6}$")))
                .andExpect(jsonPath("$.title", is("Developer Hardware Setup")))
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.amount", is(59000.00)))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].lineTotal", is(50000.00)))
                .andExpect(jsonPath("$.items[1].lineTotal", is(9000.00)))
                .andExpect(jsonPath("$.allowedActions", hasItems("EDIT", "DELETE", "SUBMIT")));
    }

    @Test
    @DisplayName("POST /api/purchase-requests should reject input missing items with RFC 9457 VALIDATION_FAILED")
    void testCreateDraftValidationFailure() throws Exception {
        PurchaseRequestInputDto input = new PurchaseRequestInputDto(
                "", // Blank title
                "Description",
                Category.IT_EQUIPMENT,
                Priority.LOW,
                testVendor.getId(),
                LocalDate.now().plusDays(5),
                List.of(), // Empty items
                null
        );

        mockMvc.perform(post("/api/purchase-requests")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType("application/problem+json"))
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.errors", notNullValue()));
    }

    @Test
    @DisplayName("PUT /api/purchase-requests/{id} should update draft and recalculate totals")
    void testUpdateDraftSuccess() throws Exception {
        // First create draft
        PurchaseRequestInputDto input = new PurchaseRequestInputDto(
                "Initial Title",
                "Initial desc",
                Category.OFFICE_SUPPLIES,
                Priority.NORMAL,
                testVendor.getId(),
                LocalDate.now().plusDays(10),
                List.of(new LineItemDto(null, "Notebooks", 10, new BigDecimal("100.00"), null)),
                null
        );

        String createRes = mockMvc.perform(post("/api/purchase-requests")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String prId = objectMapper.readTree(createRes).get("id").asText();
        int version = objectMapper.readTree(createRes).get("version").asInt();

        // Update draft
        PurchaseRequestInputDto updateInput = new PurchaseRequestInputDto(
                "Updated Title",
                "Updated desc",
                Category.OFFICE_SUPPLIES,
                Priority.HIGH,
                testVendor.getId(),
                LocalDate.now().plusDays(12),
                List.of(
                        new LineItemDto(null, "Notebooks", 15, new BigDecimal("100.00"), null),
                        new LineItemDto(null, "Pens pack", 5, new BigDecimal("200.00"), null)
                ),
                version
        );

        mockMvc.perform(put("/api/purchase-requests/" + prId)
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateInput)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Updated Title")))
                .andExpect(jsonPath("$.amount", is(2500.00)))
                .andExpect(jsonPath("$.items", hasSize(2)));
    }

    @Test
    @DisplayName("DELETE /api/purchase-requests/{id} should delete draft")
    void testDeleteDraftSuccess() throws Exception {
        PurchaseRequestInputDto input = new PurchaseRequestInputDto(
                "To Delete",
                "Desc",
                Category.SERVICES,
                Priority.LOW,
                testVendor.getId(),
                LocalDate.now().plusDays(10),
                List.of(new LineItemDto(null, "Service", 1, new BigDecimal("500.00"), null)),
                null
        );

        String createRes = mockMvc.perform(post("/api/purchase-requests")
                        .header("Authorization", "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String prId = objectMapper.readTree(createRes).get("id").asText();

        mockMvc.perform(delete("/api/purchase-requests/" + prId)
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isNoContent());

        // Verify 404
        mockMvc.perform(get("/api/purchase-requests/" + prId)
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isNotFound());
    }
}

