package com.procura.outbox;

import com.procura.ai.AiAnalysisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class OutboxService {

    private static final Logger log = LoggerFactory.getLogger(OutboxService.class);

    private final OutboxEventRepository outboxEventRepository;
    private final AiAnalysisService aiAnalysisService;

    public OutboxService(OutboxEventRepository outboxEventRepository, AiAnalysisService aiAnalysisService) {
        this.outboxEventRepository = outboxEventRepository;
        this.aiAnalysisService = aiAnalysisService;
    }

    @Transactional
    public void publishEvent(String aggregateType, String aggregateId, String eventType, String payload) {
        OutboxEvent event = new OutboxEvent(aggregateType, aggregateId, eventType, payload);
        outboxEventRepository.save(event);
    }

    @Scheduled(fixedDelay = 3000)
    @Transactional
    public void processPendingEvents() {
        List<OutboxEvent> pending = outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING", PageRequest.of(0, 20));
        for (OutboxEvent event : pending) {
            try {
                if ("REQUEST_SUBMITTED".equals(event.getEventType())) {
                    aiAnalysisService.processRequestAnalysisAsync(event.getAggregateId(), null);
                }
                event.setStatus("PROCESSED");
                event.setProcessedAt(OffsetDateTime.now());
            } catch (Exception e) {
                log.error("Failed to process outbox event {}: {}", event.getId(), e.getMessage());
                event.setRetryCount(event.getRetryCount() + 1);
                if (event.getRetryCount() >= 3) {
                    event.setStatus("FAILED");
                }
            }
            outboxEventRepository.save(event);
        }
    }
}

