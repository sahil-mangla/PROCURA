package com.procura.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HumanReviewRepository extends JpaRepository<HumanReview, Long> {

    Optional<HumanReview> findFirstByRequestIdAndStatus(String requestId, String status);

    Optional<HumanReview> findFirstByRequestIdOrderByCreatedAtDesc(String requestId);

    Page<HumanReview> findByStatus(String status, Pageable pageable);
}

