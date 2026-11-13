package com.procura.vendor;

import com.procura.vendor.dto.VendorDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/vendors", "/vendors"})
public class VendorController {

    private final VendorService vendorService;

    public record CreateVendorRequest(
        @NotBlank(message = "Vendor name is required")
        @Size(max = 200, message = "Vendor name must not exceed 200 characters")
        String name,

        @Email(message = "Invalid email format")
        String email
    ) {}

    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    @GetMapping
    public ResponseEntity<List<VendorDto>> listVendors(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(vendorService.searchVendors(q));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorDto> createVendor(@RequestBody CreateVendorRequest request) {
        VendorDto created = vendorService.createVendor(request.name(), request.email());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
