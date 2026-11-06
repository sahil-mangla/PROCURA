package com.procura.ai.client;

import java.util.List;
import java.util.Map;

public interface AiRecommendationClient {
    AiClientModels.RecommendationResponse analyze(AiClientModels.AnalysisInput request);
    List<Map<String, Object>> getModelVersions();
}

