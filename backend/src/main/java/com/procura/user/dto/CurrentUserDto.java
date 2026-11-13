package com.procura.user.dto;

import com.procura.common.enums.Role;
import com.procura.department.dto.DepartmentDto;
import com.procura.user.AppUser;

public record CurrentUserDto(
    Long id,
    String name,
    String email,
    Role role,
    Long departmentId,
    boolean active,
    DepartmentDto department
) {
    public static CurrentUserDto fromEntity(AppUser user) {
        if (user == null) return null;
        Long deptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
        DepartmentDto deptDto = DepartmentDto.fromEntity(user.getDepartment());
        return new CurrentUserDto(user.getId(), user.getName(), user.getEmail(), user.getRole(), deptId, user.isActive(), deptDto);
    }
}

