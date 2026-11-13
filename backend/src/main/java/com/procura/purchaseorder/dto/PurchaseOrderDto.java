package com.procura.purchaseorder.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.procurement.dto.LineItemDto;
import com.procura.purchaseorder.PurchaseOrder;
import com.procura.user.dto.UserRefDto;
import com.procura.vendor.dto.VendorDto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

public record PurchaseOrderDto(
    String id,
    String purchaseRequestId,
    VendorDto vendor,
    String departmentName,
    List<LineItemDto> items,
    BigDecimal total,
    String currency,
    OffsetDateTime issuedAt,
    List<UserRefDto> approvedBy
) {
    public static PurchaseOrderDto fromEntity(PurchaseOrder po, ObjectMapper mapper) {
        if (po == null) return null;
        List<UserRefDto> approvers;
        try {
            approvers = po.getApprovedByJson() != null ?
                    mapper.readValue(po.getApprovedByJson(), new TypeReference<List<UserRefDto>>() {}) : Collections.emptyList();
        } catch (Exception e) {
            approvers = Collections.emptyList();
        }

        List<LineItemDto> items = po.getItems().stream()
                .map(item -> new LineItemDto(item.getId(), item.getDescription(), item.getQuantity(), item.getUnitPrice(), item.getLineTotal()))
                .toList();

        return new PurchaseOrderDto(
            po.getId(),
            po.getPurchaseRequestId(),
            VendorDto.fromEntity(po.getVendor()),
            po.getDepartmentName(),
            items,
            po.getTotal(),
            po.getCurrency(),
            po.getIssuedAt(),
            approvers
        );
    }
}

