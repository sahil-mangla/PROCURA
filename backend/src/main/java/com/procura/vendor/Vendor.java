package com.procura.vendor;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vendor")
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 255)
    private String email;

    @Column(name = "completed_orders", nullable = false)
    private int completedOrders = 0;

    @Column(name = "first_order_at")
    private OffsetDateTime firstOrderAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public Vendor() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public int getCompletedOrders() {
        return completedOrders;
    }

    public void setCompletedOrders(int completedOrders) {
        this.completedOrders = completedOrders;
    }

    public OffsetDateTime getFirstOrderAt() {
        return firstOrderAt;
    }

    public void setFirstOrderAt(OffsetDateTime firstOrderAt) {
        this.firstOrderAt = firstOrderAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

