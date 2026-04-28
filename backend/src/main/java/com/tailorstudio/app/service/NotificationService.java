package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.AppNotification;
import com.tailorstudio.app.domain.Business;
import com.tailorstudio.app.repo.AppNotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final AppNotificationRepository notificationRepository;

    public NotificationService(AppNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<AppNotification> list(Long businessId) {
        return notificationRepository.findByBusiness_IdOrderByCreatedAtDesc(businessId);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long businessId) {
        return notificationRepository.countByBusiness_IdAndReadFlagFalse(businessId);
    }

    @Transactional
    public void markRead(Long businessId, Long notificationId) {
        AppNotification n = notificationRepository.findById(notificationId).orElseThrow();
        if (!n.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("Not found");
        }
        n.setReadFlag(true);
        notificationRepository.save(n);
    }

    @Transactional
    public void markAllRead(Long businessId) {
        for (AppNotification n : notificationRepository.findByBusiness_IdOrderByCreatedAtDesc(businessId)) {
            if (!n.isReadFlag()) {
                n.setReadFlag(true);
                notificationRepository.save(n);
            }
        }
    }

    @Transactional
    public void add(Business business, String message, Long orderId) {
        AppNotification n = new AppNotification();
        n.setBusiness(business);
        n.setMessage(message);
        n.setOrderId(orderId);
        n.setReadFlag(false);
        notificationRepository.save(n);
    }
}
