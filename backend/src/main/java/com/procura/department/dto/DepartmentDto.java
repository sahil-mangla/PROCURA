package com.procura.department.dto;

import com.procura.department.Department;

public record DepartmentDto(Long id, String name, Long headUserId) {
    public static DepartmentDto fromEntity(Department dept) {
        if (dept == null) return null;
        Long headId = dept.getHeadUser() != null ? dept.getHeadUser().getId() : null;
        return new DepartmentDto(dept.getId(), dept.getName(), headId);
    }
}

