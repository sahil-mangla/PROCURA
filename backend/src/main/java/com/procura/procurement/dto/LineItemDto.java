package com.procura.procurement.dto;

import com.procura.procurement.PurchaseRequestItem;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record LineItemDto(
    Long id,
    @NotBlank(message = "Item description is required")
    @Size(max = 300, message = "Description must not exceed 300 characters")
    String description,

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    Integer quantity,

    @NotNull(message = "Unit price is required")
    @Min(value = 0, message = "Unit price must be non-negative")
    BigDecimal unitPrice,

    BigDecimal lineTotal
) {
    public static LineItemDto fromEntity(PurchaseRequestItem item) {
        if (item == null) return null;
        return new LineItemDto(
            item.getId(),
            item.getDescription(),
            item.getQuantity(),
            item.getUnitPrice(),
            item.getLineTotal()
        );
    }
}

