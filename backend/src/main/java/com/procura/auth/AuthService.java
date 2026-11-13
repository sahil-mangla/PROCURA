package com.procura.auth;

import com.procura.auth.dto.AuthResponse;
import com.procura.auth.dto.LoginRequest;
import com.procura.common.error.Exceptions;
import com.procura.security.JwtService;
import com.procura.security.UserPrincipal;
import com.procura.user.AppUser;
import com.procura.user.UserRepository;
import com.procura.user.dto.CurrentUserDto;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception e) {
            throw new Exceptions.UnauthenticatedException("Invalid email or password.");
        }

        AppUser user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new Exceptions.NotFoundException("User not found with email: " + request.email()));

        if (!user.isActive()) {
            throw new Exceptions.ForbiddenException("User account is inactive.");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, jwtService.getExpirationSeconds(), CurrentUserDto.fromEntity(user));
    }

    @Transactional(readOnly = true)
    public CurrentUserDto getCurrentUser(UserPrincipal principal) {
        if (principal == null) {
            throw new Exceptions.UnauthenticatedException("User is not authenticated.");
        }
        AppUser user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new Exceptions.NotFoundException("User not found"));
        return CurrentUserDto.fromEntity(user);
    }
}

