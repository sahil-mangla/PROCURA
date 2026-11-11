package com.procura.audit;

import com.procura.audit.dto.AiDecisionAuditDto;
import com.procura.common.dto.PagedResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping({"/api/audit", "/audit"})
@PreAuthorize("hasAnyRole('FINANCE_MANAGER', 'ADMIN')")
public class AuditController {

    private final AiAuditAndExportService auditService;

    public AuditController(AiAuditAndExportService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/ai-decisions")
    public ResponseEntity<PagedResponse<AiDecisionAuditDto>> listAiDecisionAudits(
            @RequestParam(required = false) Boolean override,
            @RequestParam(required = false) String modelVersion,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(auditService.listAiDecisionAudits(override, modelVersion, from, to, page, size));
    }
}
