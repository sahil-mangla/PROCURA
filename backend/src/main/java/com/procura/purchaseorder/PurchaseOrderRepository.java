package com.procura.purchaseorder;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {

    Optional<PurchaseOrder> findByPurchaseRequestId(String purchaseRequestId);

    boolean existsByPurchaseRequestId(String purchaseRequestId);

    @Query(value = "SELECT nextval('purchase_order_seq')", nativeQuery = true)
    Long getNextSequenceValue();

    @Query("SELECT po FROM PurchaseOrder po JOIN PurchaseRequest pr ON po.purchaseRequestId = pr.id " +
           "WHERE :canSeeAll = true OR pr.requester.id = :userId OR pr.department.id = :deptId " +
           "ORDER BY po.issuedAt DESC")
    Page<PurchaseOrder> findVisibleOrders(
            @Param("canSeeAll") boolean canSeeAll,
            @Param("userId") Long userId,
            @Param("deptId") Long deptId,
            Pageable pageable
    );
}

