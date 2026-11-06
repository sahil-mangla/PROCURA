package com.procura.common.dto;

import java.util.List;

public record PageMeta(int page, int size, long totalItems) {
    public static PageMeta of(int page, int size, long totalItems) {
        return new PageMeta(page, size, totalItems);
    }
}

