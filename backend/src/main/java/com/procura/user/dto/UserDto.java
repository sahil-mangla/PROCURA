package com.procura.user.dto;

import com.procura.common.enums.Role;
import com.procura.department.dto.DepartmentDto;
import com.procura.user.AppUser;

public record UserDto(
    Long id,
    String name,
    String email,
    Role role,
    Long departmentId,
    boolean active
) {
    public static UserDto fromEntity(AppUser user) {
        if (user == null) return null;
        Long deptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole(), deptId, user.isActive());
    }
}

