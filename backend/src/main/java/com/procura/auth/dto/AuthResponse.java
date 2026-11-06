package com.procura.auth.dto;

import com.procura.user.dto.CurrentUserDto;

public record AuthResponse(
    String accessToken,
    long expiresIn,
    CurrentUserDto user
) {}

