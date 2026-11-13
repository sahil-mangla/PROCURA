package com.procura.review;

import com.procura.common.enums.HumanDecision;
import com.procura.common.enums.Recommendation;
import com.procura.user.AppUser;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "human_review")
public class HumanReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, length = 30)
    private String requestId;

    @Column(name = "request_title", nullable = false, length = 200)
    private String requestTitle;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 20)
    private String status = "OPEN"; // OPEN or DECIDED

    @Column(name = "triggers_json", nullable = false, columnDefinition = "TEXT")
    private String triggersJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_recommendation", length = 20)
    private Recommendation aiRecommendation;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private HumanDecision decision;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by_id")
    private AppUser decidedBy;

    @Column(name = "decided_at")
    private OffsetDateTime decidedAt;

    private Boolean override;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public HumanReview() {}

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

    public String getRequestTitle() {
        return requestTitle;
    }

    public void setRequestTitle(String requestTitle) {
        this.requestTitle = requestTitle;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTriggersJson() {
        return triggersJson;
    }

    public void setTriggersJson(String triggersJson) {
        this.triggersJson = triggersJson;
    }

    public Recommendation getAiRecommendation() {
        return aiRecommendation;
    }

    public void setAiRecommendation(Recommendation aiRecommendation) {
        this.aiRecommendation = aiRecommendation;
    }

    public Double getAiConfidence() {
        return aiConfidence;
    }

    public void setAiConfidence(Double aiConfidence) {
        this.aiConfidence = aiConfidence;
    }

    public HumanDecision getDecision() {
        return decision;
    }

    public void setDecision(HumanDecision decision) {
        this.decision = decision;
    }

    public AppUser getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(AppUser decidedBy) {
        this.decidedBy = decidedBy;
    }

    public OffsetDateTime getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(OffsetDateTime decidedAt) {
        this.decidedAt = decidedAt;
    }

    public Boolean getOverride() {
        return override;
    }

    public void setOverride(Boolean override) {
        this.override = override;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

