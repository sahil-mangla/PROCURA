package com.procura.common.error;

import org.springframework.http.HttpStatus;

public class AppException extends RuntimeException {
    private final ProblemCode code;
    private final HttpStatus status;
    private final String title;

    public AppException(ProblemCode code, HttpStatus status, String title, String detail) {
        super(detail);
        this.code = code;
        this.status = status;
        this.title = title;
    }

    public ProblemCode getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getTitle() {
        return title;
    }
}

