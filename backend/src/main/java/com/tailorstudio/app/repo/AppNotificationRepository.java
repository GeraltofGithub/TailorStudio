package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {

    List<AppNotification> findByBusiness_IdOrderByCreatedAtDesc(Long businessId);

    long countByBusiness_IdAndReadFlagFalse(Long businessId);
}
