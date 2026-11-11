package com.procura.vendor.dto;

import com.procura.vendor.Vendor;
import java.time.OffsetDateTime;

public record VendorDto(
    Long id,
    String name,
    String email,
    int completedOrders,
    OffsetDateTime firstOrderAt
) {
    public static VendorDto fromEntity(Vendor vendor) {
        if (vendor == null) return null;
        return new VendorDto(
            vendor.getId(),
            vendor.getName(),
            vendor.getEmail(),
            vendor.getCompletedOrders(),
            vendor.getFirstOrderAt()
        );
    }
}

