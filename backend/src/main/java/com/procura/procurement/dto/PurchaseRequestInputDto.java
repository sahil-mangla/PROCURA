package com.procura.procurement.dto;

import com.procura.common.enums.Category;
import com.procura.common.enums.Priority;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record PurchaseRequestInputDto(
    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    String title,

    @Size(max = 4000, message = "Description must not exceed 4000 characters")
    String description,

    @NotNull(message = "Category is required")
    Category category,

    Priority priority,

    @NotNull(message = "Vendor is required")
    Long vendorId,

    LocalDate neededBy,

    @NotEmpty(message = "At least one item is required")
    @Valid
    List<LineItemDto> items,

    Integer version // Present on update (PUT)
) {}

