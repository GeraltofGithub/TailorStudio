package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.AppNotification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AppNotificationRepository extends MongoRepository<AppNotification, Long> {

    List<AppNotification> findByBusinessIdOrderByCreatedAtDesc(Long businessId);

    long countByBusinessIdAndReadFlagFalse(Long businessId);
}
