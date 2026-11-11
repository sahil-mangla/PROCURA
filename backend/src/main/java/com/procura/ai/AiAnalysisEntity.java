package com.procura.ai;

import com.procura.common.enums.Recommendation;
import com.procura.common.enums.RiskLevel;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "ai_analysis")
public class AiAnalysisEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, length = 30)
    private String requestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Recommendation recommendation;

    @Column(nullable = false)
    private double confidence;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 20)
    private RiskLevel riskLevel;

    @Column(name = "requires_human_review", nullable = false)
    private boolean requiresHumanReview;

    @Column(name = "review_threshold", nullable = false)
    private double reviewThreshold = 0.8;

    @Column(name = "reasons_json", nullable = false, columnDefinition = "TEXT")
    private String reasonsJson;

    @Column(name = "review_triggers_json", nullable = false, columnDefinition = "TEXT")
    private String reviewTriggersJson;

    @Column(name = "evidence_json", nullable = false, columnDefinition = "TEXT")
    private String evidenceJson;

    @Column(name = "model_version", nullable = false, length = 100)
    private String modelVersion;

    @Column(name = "agent_versions_json", nullable = false, columnDefinition = "TEXT")
    private String agentVersionsJson;

    @Column(name = "analysed_at", nullable = false)
    private OffsetDateTime analysedAt;

    @Column(name = "evidence_rejected", nullable = false)
    private boolean evidenceRejected = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public AiAnalysisEntity() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public Recommendation getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(Recommendation recommendation) {
        this.recommendation = recommendation;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(RiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public boolean isRequiresHumanReview() {
        return requiresHumanReview;
    }

    public void setRequiresHumanReview(boolean requiresHumanReview) {
        this.requiresHumanReview = requiresHumanReview;
    }

    public double getReviewThreshold() {
        return reviewThreshold;
    }

    public void setReviewThreshold(double reviewThreshold) {
        this.reviewThreshold = reviewThreshold;
    }

    public String getReasonsJson() {
        return reasonsJson;
    }

    public void setReasonsJson(String reasonsJson) {
        this.reasonsJson = reasonsJson;
    }

    public String getReviewTriggersJson() {
        return reviewTriggersJson;
    }

    public void setReviewTriggersJson(String reviewTriggersJson) {
        this.reviewTriggersJson = reviewTriggersJson;
    }

    public String getEvidenceJson() {
        return evidenceJson;
    }

    public void setEvidenceJson(String evidenceJson) {
        this.evidenceJson = evidenceJson;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public String getAgentVersionsJson() {
        return agentVersionsJson;
    }

    public void setAgentVersionsJson(String agentVersionsJson) {
        this.agentVersionsJson = agentVersionsJson;
    }

    public OffsetDateTime getAnalysedAt() {
        return analysedAt;
    }

    public void setAnalysedAt(OffsetDateTime analysedAt) {
        this.analysedAt = analysedAt;
    }

    public boolean isEvidenceRejected() {
        return evidenceRejected;
    }

    public void setEvidenceRejected(boolean evidenceRejected) {
        this.evidenceRejected = evidenceRejected;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

