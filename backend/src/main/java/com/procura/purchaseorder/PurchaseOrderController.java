package com.procura.purchaseorder;

import com.procura.common.dto.PagedResponse;
import com.procura.purchaseorder.dto.PurchaseOrderDto;
import com.procura.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/purchase-orders", "/purchase-orders"})
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<PurchaseOrderDto>> listPurchaseOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(purchaseOrderService.listPurchaseOrders(page, size, principal));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderDto> getPurchaseOrder(@PathVariable String id) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrder(id));
    }
}
