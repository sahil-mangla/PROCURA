package com.procura.ai.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@Primary
public class HttpAiRecommendationClient implements AiRecommendationClient {

    private static final Logger log = LoggerFactory.getLogger(HttpAiRecommendationClient.class);

    private final RestClient restClient;
    private final boolean mockEnabled;
    private final StubAiRecommendationClient stubClient;
    private final int timeoutSeconds;
    private final int retryAttempts;
    private final ObjectMapper objectMapper;

    public HttpAiRecommendationClient(
            @Value("${procura.ai.service-url:http://localhost:8000}") String serviceUrl,
            @Value("${security.service-key:procura-internal-service-key-2026}") String serviceKey,
            @Value("${procura.ai.mock-enabled:true}") boolean mockEnabled,
            @Value("${procura.ai.timeout-seconds:15}") int timeoutSeconds,
            @Value("${procura.ai.retry-attempts:1}") int retryAttempts,
            StubAiRecommendationClient stubClient,
            ObjectMapper objectMapper) {

        this.mockEnabled = mockEnabled;
        this.stubClient = stubClient;
        this.timeoutSeconds = timeoutSeconds;
        this.retryAttempts = retryAttempts;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .defaultHeader("X-Service-Key", serviceKey)
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public AiClientModels.RecommendationResponse analyze(AiClientModels.AnalysisInput request) {
        if (mockEnabled) {
            log.info("AI mock mode enabled, returning stub analysis for request {}", request.requestId());
            return stubClient.analyze(request);
        }

        Exception lastException = null;
        int maxTries = 1 + retryAttempts;

        for (int attempt = 1; attempt <= maxTries; attempt++) {
            try {
                log.info("Calling Python AI service for request {} (attempt {}/{})", request.requestId(), attempt, maxTries);
                return restClient.post()
                        .uri("/v1/analyses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(request)
                        .retrieve()
                        .body(AiClientModels.RecommendationResponse.class);
            } catch (Exception e) {
                lastException = e;
                log.warn("Attempt {} to call AI service failed: {}", attempt, e.getMessage());
            }
        }

        log.error("All {} attempts to call AI service failed for request {}. Falling back to stub or throwing.", maxTries, request.requestId(), lastException);
        throw new RuntimeException("AI service call failed after retries: " + (lastException != null ? lastException.getMessage() : "unknown"));
    }

    @Override
    public List<Map<String, Object>> getModelVersions() {
        if (mockEnabled) {
            return stubClient.getModelVersions();
        }
        try {
            return restClient.get()
                    .uri("/v1/models")
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.warn("Failed to fetch model versions from AI service, falling back to stub info: {}", e.getMessage());
            return stubClient.getModelVersions();
        }
    }
}
