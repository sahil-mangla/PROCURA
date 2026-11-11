package com.procura.budget;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    @Query("SELECT b FROM Budget b WHERE (:deptId IS NULL OR b.department.id = :deptId) AND (:fiscalYear IS NULL OR b.fiscalYear = :fiscalYear)")
    List<Budget> findByFilters(@Param("deptId") Long deptId, @Param("fiscalYear") String fiscalYear);

    Optional<Budget> findByDepartmentIdAndFiscalYear(Long departmentId, String fiscalYear);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Budget b WHERE b.department.id = :deptId AND b.fiscalYear = :fiscalYear")
    Optional<Budget> findWithLockByDepartmentIdAndFiscalYear(@Param("deptId") Long deptId, @Param("fiscalYear") String fiscalYear);
}

