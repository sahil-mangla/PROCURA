package com.procura.ai;

import com.procura.ai.dto.InternalAiExportDtos;
import com.procura.audit.AiAuditAndExportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping({"/api/internal/ai", "/internal/ai"})
@PreAuthorize("hasAuthority('ROLE_SERVICE_KEY')")
public class InternalAiController {

    private final AiAuditAndExportService auditService;

    public InternalAiController(AiAuditAndExportService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/historical-requests")
    public ResponseEntity<InternalAiExportDtos.HistoricalRequestExportResponse> exportHistoricalRequests(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime updatedSince,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "500") int limit
    ) {
        return ResponseEntity.ok(auditService.exportHistoricalRequests(updatedSince, cursor, limit));
    }

    @GetMapping("/outcomes")
    public ResponseEntity<InternalAiExportDtos.OutcomeExportResponse> exportOutcomes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime since,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "500") int limit
    ) {
        return ResponseEntity.ok(auditService.exportOutcomes(since, cursor, limit));
    }
}
