package com.procura.common.dto;

import java.util.List;

public record PagedResponse<T>(int page, int size, long totalItems, List<T> items) {
    public static <T> PagedResponse<T> of(int page, int size, long totalItems, List<T> items) {
        return new PagedResponse<>(page, size, totalItems, items);
    }
}

