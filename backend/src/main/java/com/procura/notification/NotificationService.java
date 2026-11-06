package com.procura.notification;

import com.procura.common.enums.HistoryEvent;
import com.procura.common.enums.HumanDecision;
import com.procura.common.enums.Recommendation;
import com.procura.common.enums.Role;
import com.procura.notification.dto.NotificationDto;
import com.procura.user.AppUser;
import com.procura.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void notifyUser(AppUser user, HistoryEvent event, String requestId, String message, boolean override, Recommendation aiRec, HumanDecision humanDec) {
        if (user == null) return;
        Notification n = new Notification();
        n.setUser(user);
        n.setEvent(event.name());
        n.setRequestId(requestId);
        n.setMessage(message);
        n.setOverride(override);
        n.setAiRecommendation(aiRec != null ? aiRec.name() : null);
        n.setHumanDecision(humanDec != null ? humanDec.name() : null);
        n.setRead(false);
        n.setCreatedAt(OffsetDateTime.now());
        notificationRepository.save(n);
    }

    @Transactional
    public void notifyDepartmentHeads(Long departmentId, HistoryEvent event, String requestId, String message, boolean override, Recommendation aiRec, HumanDecision humanDec) {
        List<AppUser> deptHeads = userRepository.findAllByDepartmentIdAndRole(departmentId, Role.DEPARTMENT_HEAD);
        for (AppUser head : deptHeads) {
            notifyUser(head, event, requestId, message, override, aiRec, humanDec);
        }
    }

    @Transactional
    public void notifyFinanceManagers(HistoryEvent event, String requestId, String message, boolean override, Recommendation aiRec, HumanDecision humanDec) {
        List<AppUser> financeManagers = userRepository.findAllByRole(Role.FINANCE_MANAGER);
        for (AppUser finance : financeManagers) {
            notifyUser(finance, event, requestId, message, override, aiRec, humanDec);
        }
    }

    @Transactional(readOnly = true)
    public NotificationDto.NotificationListResponse listNotifications(Long userId, Boolean unreadOnly, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> p;
        if (Boolean.TRUE.equals(unreadOnly)) {
            p = notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false, pageable);
        } else {
            p = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        long unreadCount = notificationRepository.countByUserIdAndReadFalse(userId);

        List<NotificationDto> items = p.getContent().stream()
                .map(NotificationDto::fromEntity)
                .toList();

        return new NotificationDto.NotificationListResponse(page, size, p.getTotalElements(), unreadCount, items);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(userId)) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }
}

