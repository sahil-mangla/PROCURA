package com.procura.vendor;

import com.procura.common.error.Exceptions;
import com.procura.vendor.dto.VendorDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class VendorService {

    private final VendorRepository vendorRepository;

    public VendorService(VendorRepository vendorRepository) {
        this.vendorRepository = vendorRepository;
    }

    @Transactional(readOnly = true)
    public List<VendorDto> searchVendors(String query) {
        return vendorRepository.searchVendors(query != null ? query.trim() : "").stream()
                .map(VendorDto::fromEntity)
                .toList();
    }

    @Transactional
    public VendorDto createVendor(String name, String email) {
        if (name == null || name.isBlank()) {
            throw new Exceptions.ValidationException("Vendor name is required.");
        }
        Vendor vendor = new Vendor();
        vendor.setName(name.trim());
        vendor.setEmail(email != null && !email.isBlank() ? email.trim() : null);
        vendor.setCompletedOrders(0);
        vendor.setFirstOrderAt(null);
        vendor.setCreatedAt(OffsetDateTime.now());

        Vendor saved = vendorRepository.save(vendor);
        return VendorDto.fromEntity(saved);
    }
}

