package com.procura.user.dto;

import com.procura.common.enums.Role;
import com.procura.user.AppUser;

public record UserRefDto(Long id, String name, Role role) {
    public static UserRefDto fromEntity(AppUser user) {
        if (user == null) return null;
        return new UserRefDto(user.getId(), user.getName(), user.getRole());
    }
}

