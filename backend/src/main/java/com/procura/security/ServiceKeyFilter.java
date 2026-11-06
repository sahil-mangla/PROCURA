package com.procura.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.common.error.ProblemCode;
import com.procura.common.error.ProblemResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class ServiceKeyFilter extends OncePerRequestFilter {

    private final String expectedServiceKey;
    private final ObjectMapper objectMapper;

    public ServiceKeyFilter(
            @Value("${security.service-key:procura-internal-service-key-2026}") String expectedServiceKey,
            ObjectMapper objectMapper) {
        this.expectedServiceKey = expectedServiceKey;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path.contains("/internal/ai/")) {
            String serviceKey = request.getHeader("X-Service-Key");
            if (serviceKey == null || !serviceKey.equals(expectedServiceKey)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/problem+json");
                ProblemResponse problem = ProblemResponse.of(
                        ProblemCode.UNAUTHENTICATED,
                        401,
                        "Invalid or missing service key",
                        "A valid X-Service-Key header is required for internal AI endpoints."
                );
                objectMapper.writeValue(response.getOutputStream(), problem);
                return;
            }

            // Valid service key
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    "AI_SERVICE",
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_SERVICE_KEY"))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}

