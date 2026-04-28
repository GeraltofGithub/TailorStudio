package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.AppNotification;
import com.tailorstudio.app.domain.Business;
import com.tailorstudio.app.mongo.SequenceService;
import com.tailorstudio.app.repo.AppNotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final AppNotificationRepository notificationRepository;
    private final SequenceService seq;

    public NotificationService(AppNotificationRepository notificationRepository, SequenceService seq) {
        this.notificationRepository = notificationRepository;
        this.seq = seq;
    }

    @Transactional(readOnly = true)
    public List<AppNotification> list(Long businessId) {
        return notificationRepository.findByBusinessIdOrderByCreatedAtDesc(businessId);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long businessId) {
        return notificationRepository.countByBusinessIdAndReadFlagFalse(businessId);
    }

    @Transactional
    public void markRead(Long businessId, Long notificationId) {
        AppNotification n = notificationRepository.findById(notificationId).orElseThrow();
        if (n.getBusinessId() == null || !n.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("Not found");
        }
        n.setReadFlag(true);
        notificationRepository.save(n);
    }

    @Transactional
    public void markAllRead(Long businessId) {
        for (AppNotification n : notificationRepository.findByBusinessIdOrderByCreatedAtDesc(businessId)) {
            if (!n.isReadFlag()) {
                n.setReadFlag(true);
                notificationRepository.save(n);
            }
        }
    }

    @Transactional
    public void add(Business business, String message, Long orderId) {
        AppNotification n = new AppNotification();
        n.setId(seq.next("notifications"));
        if (n.getMongoObjectId() == null || n.getMongoObjectId().isBlank()) {
            n.setMongoObjectId(new org.bson.types.ObjectId().toHexString());
        }
        n.setBusinessId(business != null ? business.getId() : null);
        n.setMessage(message);
        n.setOrderId(orderId);
        n.setReadFlag(false);
        notificationRepository.save(n);
    }
}
