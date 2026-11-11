package com.procura.ai;

import com.procura.audit.AiAuditAndExportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/ai", "/ai"})
public class AiModelController {

    private final AiAuditAndExportService auditService;

    public AiModelController(AiAuditAndExportService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/models")
    public ResponseEntity<List<Map<String, Object>>> listModels() {
        return ResponseEntity.ok(auditService.getModelVersions());
    }
}
