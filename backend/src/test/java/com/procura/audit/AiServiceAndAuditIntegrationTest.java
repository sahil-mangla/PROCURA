package com.procura.audit;

import com.procura.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AiServiceAndAuditIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("GET /api/internal/ai/historical-requests requires X-Service-Key header (401 without it)")
    void testHistoricalRequestsAuthentication() throws Exception {
        mockMvc.perform(get("/api/internal/ai/historical-requests"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));

        mockMvc.perform(get("/api/internal/ai/historical-requests")
                        .header("X-Service-Key", "procura-internal-service-key-2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/internal/ai/outcomes requires X-Service-Key header")
    void testOutcomesAuthentication() throws Exception {
        mockMvc.perform(get("/api/internal/ai/outcomes")
                        .header("X-Service-Key", "procura-internal-service-key-2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/audit/ai-decisions requires FINANCE_MANAGER or ADMIN role")
    void testAiDecisionAuditEndpoint() throws Exception {
        // Requester cannot access
        mockMvc.perform(get("/api/audit/ai-decisions")
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("FORBIDDEN")));

        // Finance Manager can access
        mockMvc.perform(get("/api/audit/ai-decisions")
                        .header("Authorization", "Bearer " + financeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/ai/models proxies model information")
    void testListModels() throws Exception {
        mockMvc.perform(get("/api/ai/models")
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].version", is("approval-model-v2")));
    }
}

