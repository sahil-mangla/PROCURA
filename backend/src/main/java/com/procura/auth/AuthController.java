package com.procura.auth;

import com.procura.auth.dto.AuthResponse;
import com.procura.auth.dto.LoginRequest;
import com.procura.security.UserPrincipal;
import com.procura.user.dto.CurrentUserDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/auth", "/auth"})
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentUserDto> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        CurrentUserDto currentUser = authService.getCurrentUser(principal);
        return ResponseEntity.ok(currentUser);
    }
}
