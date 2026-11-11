package com.procura.procurement;

import com.procura.common.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, String>, JpaSpecificationExecutor<PurchaseRequest> {

    @Query(value = "SELECT nextval('purchase_request_seq')", nativeQuery = true)
    Long getNextSequenceValue();

    @Query("SELECT pr FROM PurchaseRequest pr WHERE pr.status IN :terminalStatuses " +
           "AND (:updatedSince IS NULL OR pr.updatedAt >= :updatedSince) " +
           "AND (:cursor IS NULL OR pr.id > :cursor) " +
           "ORDER BY pr.id ASC")
    List<PurchaseRequest> findHistoricalExport(
            @Param("terminalStatuses") Collection<RequestStatus> terminalStatuses,
            @Param("updatedSince") OffsetDateTime updatedSince,
            @Param("cursor") String cursor,
            Pageable pageable
    );
}

