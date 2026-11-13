package com.procura.common.error;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final MediaType PROBLEM_JSON = MediaType.parseMediaType("application/problem+json");

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ProblemResponse> handleAppException(AppException ex) {
        log.warn("Application exception [code={}, status={}]: {}", ex.getCode(), ex.getStatus(), ex.getMessage());
        ProblemResponse body = ProblemResponse.of(ex.getCode(), ex.getStatus().value(), ex.getTitle(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
                .contentType(PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemResponse> handleValidationException(MethodArgumentNotValidException ex) {
        log.warn("Method argument validation failure: {}", ex.getMessage());
        List<ProblemResponse.FieldErrorItem> errors = new ArrayList<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.add(new ProblemResponse.FieldErrorItem(fieldError.getField(), fieldError.getDefaultMessage()));
        }

        ProblemResponse body = ProblemResponse.ofValidation("Fix the highlighted fields and try again.", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .contentType(PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemResponse> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        ProblemResponse body = ProblemResponse.of(ProblemCode.FORBIDDEN, 403, "Forbidden", "You do not have permission to perform this action.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .contentType(PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemResponse> handleAuthenticationException(AuthenticationException ex) {
        log.warn("Authentication failed: {}", ex.getMessage());
        ProblemResponse body = ProblemResponse.of(ProblemCode.UNAUTHENTICATED, 401, "Unauthenticated", "Your session has ended or credentials were invalid.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .contentType(PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ProblemResponse> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        log.warn("Static resource not found: {}", ex.getMessage());
        ProblemResponse body = ProblemResponse.of(ProblemCode.NOT_FOUND, 404, "Not Found", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler({
            org.springframework.orm.ObjectOptimisticLockingFailureException.class,
            jakarta.persistence.OptimisticLockException.class
    })
    public ResponseEntity<ProblemResponse> handleOptimisticLockFailure(Exception ex) {
        log.warn("Optimistic lock conflict: {}", ex.getMessage());
        ProblemResponse body = ProblemResponse.of(
                ProblemCode.WORKFLOW_CONFLICT,
                409,
                "Workflow Conflict",
                "The resource was modified concurrently by another transaction. Please reload to see the latest state."
        );
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .contentType(PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemResponse> handleGenericException(Exception ex) {
        log.error("Unhandled internal server error", ex);
        ProblemResponse body = ProblemResponse.of(ProblemCode.INTERNAL_ERROR, 500, "Internal Server Error", "An unexpected error occurred. Please try again later.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(PROBLEM_JSON)
                .body(body);
    }
}
