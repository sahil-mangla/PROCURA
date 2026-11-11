package com.procura.department;

import com.procura.department.dto.DepartmentDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public List<DepartmentDto> listDepartments() {
        return departmentRepository.findAll().stream()
                .map(DepartmentDto::fromEntity)
                .toList();
    }
}

