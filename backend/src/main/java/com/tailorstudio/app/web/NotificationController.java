package com.tailorstudio.app.web;

import com.tailorstudio.app.domain.AppNotification;
import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public NotificationController(CurrentUserService currentUserService, NotificationService notificationService) {
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<AppNotification> list() {
        var u = currentUserService.requireUser();
        return notificationService.list(u.getBusinessId());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        var u = currentUserService.requireUser();
        return Map.of("count", notificationService.unreadCount(u.getBusinessId()));
    }

    @PostMapping("/{id}/read")
    public Map<String, Boolean> markRead(@PathVariable Long id) {
        var u = currentUserService.requireUser();
        notificationService.markRead(u.getBusinessId(), id);
        return Map.of("ok", true);
    }

    @PostMapping("/read-all")
    public Map<String, Boolean> markAllRead() {
        var u = currentUserService.requireUser();
        notificationService.markAllRead(u.getBusinessId());
        return Map.of("ok", true);
    }
}
