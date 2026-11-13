package com.procura.vendor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {
    @Query("SELECT v FROM Vendor v WHERE :q IS NULL OR :q = '' OR LOWER(v.name) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY v.name ASC")
    List<Vendor> searchVendors(@Param("q") String q);
}

