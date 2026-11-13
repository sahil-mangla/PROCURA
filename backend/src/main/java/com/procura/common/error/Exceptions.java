package com.procura.common.error;

import org.springframework.http.HttpStatus;

public class Exceptions {

    public static class NotFoundException extends AppException {
        public NotFoundException(String detail) {
            super(ProblemCode.NOT_FOUND, HttpStatus.NOT_FOUND, "Resource not found", detail);
        }
    }

    public static class ForbiddenException extends AppException {
        public ForbiddenException(String detail) {
            super(ProblemCode.FORBIDDEN, HttpStatus.FORBIDDEN, "Forbidden", detail);
        }
    }

    public static class UnauthenticatedException extends AppException {
        public UnauthenticatedException(String detail) {
            super(ProblemCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, "Unauthenticated", detail);
        }
    }

    public static class WorkflowConflictException extends AppException {
        public WorkflowConflictException(String detail) {
            super(ProblemCode.WORKFLOW_CONFLICT, HttpStatus.CONFLICT, "Someone else acted on this request first", detail);
        }
    }

    public static class InvalidTransitionException extends AppException {
        public InvalidTransitionException(String detail) {
            super(ProblemCode.INVALID_TRANSITION, HttpStatus.CONFLICT, "Invalid workflow transition", detail);
        }
    }

    public static class BusinessRuleViolationException extends AppException {
        public BusinessRuleViolationException(String detail) {
            super(ProblemCode.BUSINESS_RULE_VIOLATION, HttpStatus.UNPROCESSABLE_ENTITY, "Business rule violation", detail);
        }
    }

    public static class ValidationException extends AppException {
        public ValidationException(String detail) {
            super(ProblemCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, "Validation failed", detail);
        }
    }
}

