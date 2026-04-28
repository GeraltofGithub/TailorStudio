package com.tailorstudio.app.web;

import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final CurrentUserService currentUserService;
    private final DashboardService dashboardService;

    public DashboardController(CurrentUserService currentUserService, DashboardService dashboardService) {
        this.currentUserService = currentUserService;
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public DashboardService.DashboardStats stats() {
        var u = currentUserService.requireUser();
        return dashboardService.stats(u.getBusinessId());
    }
}
