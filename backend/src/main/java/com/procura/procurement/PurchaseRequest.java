package com.procura.procurement;

import com.procura.common.enums.AiStatus;
import com.procura.common.enums.Category;
import com.procura.common.enums.Priority;
import com.procura.common.enums.RequestStatus;
import com.procura.department.Department;
import com.procura.user.AppUser;
import com.procura.vendor.Vendor;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "purchase_request")
public class PurchaseRequest {

    @Id
    @Column(length = 30)
    private String id; // PR-1042

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequestStatus status = RequestStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private AppUser requester;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(nullable = false, length = 10)
    private String currency = "INR";

    @Column(name = "needed_by")
    private LocalDate neededBy;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "budget_total_at_submit", precision = 19, scale = 2)
    private BigDecimal budgetTotalAtSubmit;

    @Column(name = "budget_remaining_at_submit", precision = 19, scale = 2)
    private BigDecimal budgetRemainingAtSubmit;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_status", nullable = false, length = 30)
    private AiStatus aiStatus = AiStatus.NOT_STARTED;

    @Column(name = "latest_analysis_id")
    private Long latestAnalysisId;

    @Column(name = "open_review_id")
    private Long openReviewId;

    @Column(name = "purchase_order_id", length = 30)
    private String purchaseOrderId;

    @Column(name = "rejected_at_stage", length = 30)
    private String rejectedAtStage;

    @Version
    @Column(nullable = false)
    private int version = 0;

    @OneToMany(mappedBy = "purchaseRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<PurchaseRequestItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public PurchaseRequest() {}

    public void addItem(PurchaseRequestItem item) {
        items.add(item);
        item.setPurchaseRequest(this);
    }

    public void clearItems() {
        for (PurchaseRequestItem item : items) {
            item.setPurchaseRequest(null);
        }
        items.clear();
    }

    public void recalculateTotals() {
        BigDecimal sum = BigDecimal.ZERO;
        for (PurchaseRequestItem item : items) {
            if (item.getLineTotal() != null) {
                sum = sum.add(item.getLineTotal());
            }
        }
        this.amount = sum;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public RequestStatus getStatus() {
        return status;
    }

    public void setStatus(RequestStatus status) {
        this.status = status;
    }

    public AppUser getRequester() {
        return requester;
    }

    public void setRequester(AppUser requester) {
        this.requester = requester;
    }

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
    }

    public Vendor getVendor() {
        return vendor;
    }

    public void setVendor(Vendor vendor) {
        this.vendor = vendor;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public LocalDate getNeededBy() {
        return neededBy;
    }

    public void setNeededBy(LocalDate neededBy) {
        this.neededBy = neededBy;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(OffsetDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public BigDecimal getBudgetTotalAtSubmit() {
        return budgetTotalAtSubmit;
    }

    public void setBudgetTotalAtSubmit(BigDecimal budgetTotalAtSubmit) {
        this.budgetTotalAtSubmit = budgetTotalAtSubmit;
    }

    public BigDecimal getBudgetRemainingAtSubmit() {
        return budgetRemainingAtSubmit;
    }

    public void setBudgetRemainingAtSubmit(BigDecimal budgetRemainingAtSubmit) {
        this.budgetRemainingAtSubmit = budgetRemainingAtSubmit;
    }

    public AiStatus getAiStatus() {
        return aiStatus;
    }

    public void setAiStatus(AiStatus aiStatus) {
        this.aiStatus = aiStatus;
    }

    public Long getLatestAnalysisId() {
        return latestAnalysisId;
    }

    public void setLatestAnalysisId(Long latestAnalysisId) {
        this.latestAnalysisId = latestAnalysisId;
    }

    public Long getOpenReviewId() {
        return openReviewId;
    }

    public void setOpenReviewId(Long openReviewId) {
        this.openReviewId = openReviewId;
    }

    public String getPurchaseOrderId() {
        return purchaseOrderId;
    }

    public void setPurchaseOrderId(String purchaseOrderId) {
        this.purchaseOrderId = purchaseOrderId;
    }

    public String getRejectedAtStage() {
        return rejectedAtStage;
    }

    public void setRejectedAtStage(String rejectedAtStage) {
        this.rejectedAtStage = rejectedAtStage;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public List<PurchaseRequestItem> getItems() {
        return items;
    }

    public void setItems(List<PurchaseRequestItem> items) {
        this.items = items;
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

