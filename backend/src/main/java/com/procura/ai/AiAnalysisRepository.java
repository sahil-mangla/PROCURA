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

    // No "param IS NULL" tests: PostgreSQL cannot infer the type of an untyped null parameter
    // ("could not determine data type of parameter"). Callers pass "" and wide bounds instead.
    @Query("SELECT a FROM AiAnalysisEntity a WHERE " +
           "(:modelVersion = '' OR a.modelVersion = :modelVersion) AND " +
           "a.analysedAt >= :fromTime AND " +
           "a.analysedAt <= :toTime " +
           "ORDER BY a.analysedAt DESC")
    Page<AiAnalysisEntity> findAudits(
            @Param("modelVersion") String modelVersion,
            @Param("fromTime") OffsetDateTime fromTime,
            @Param("toTime") OffsetDateTime toTime,
            Pageable pageable
    );
}

