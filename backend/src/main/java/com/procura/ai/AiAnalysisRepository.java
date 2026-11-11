package com.procura.ai;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AiAnalysisRepository extends JpaRepository<AiAnalysisEntity, Long> {

    List<AiAnalysisEntity> findAllByRequestIdOrderByAnalysedAtDesc(String requestId);

    Optional<AiAnalysisEntity> findFirstByRequestIdOrderByAnalysedAtDesc(String requestId);

    @Query("SELECT a FROM AiAnalysisEntity a WHERE " +
           "(:modelVersion IS NULL OR a.modelVersion = :modelVersion) AND " +
           "(:fromTime IS NULL OR a.analysedAt >= :fromTime) AND " +
           "(:toTime IS NULL OR a.analysedAt <= :toTime) " +
           "ORDER BY a.analysedAt DESC")
    Page<AiAnalysisEntity> findAudits(
            @Param("modelVersion") String modelVersion,
            @Param("fromTime") OffsetDateTime fromTime,
            @Param("toTime") OffsetDateTime toTime,
            Pageable pageable
    );
}

