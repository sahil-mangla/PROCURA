package com.procura.auth;

import com.procura.BaseIntegrationTest;
import com.procura.auth.dto.LoginRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("POST /api/auth/login should succeed with valid credentials")
    void testSuccessfulLogin() throws Exception {
        LoginRequest request = new LoginRequest("test.requester@procura.local", "password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.expiresIn", is(86400)))
                .andExpect(jsonPath("$.user.email", is("test.requester@procura.local")))
                .andExpect(jsonPath("$.user.role", is("REQUESTER")))
                .andExpect(jsonPath("$.user.department.name", is("Engineering")));
    }

    @Test
    @DisplayName("POST /api/auth/login should return 401 UNAUTHENTICATED with invalid password")
    void testFailedLogin() throws Exception {
        LoginRequest request = new LoginRequest("test.requester@procura.local", "wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType("application/problem+json"))
                .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")))
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("GET /api/auth/me should return current user profile with valid Bearer token")
    void testGetCurrentUser() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("test.requester@procura.local")))
                .andExpect(jsonPath("$.role", is("REQUESTER")))
                .andExpect(jsonPath("$.department.name", is("Engineering")));
    }

    @Test
    @DisplayName("GET /api/auth/me should return 401 when token is missing")
    void testGetCurrentUserUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType("application/problem+json"))
                .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }
}

