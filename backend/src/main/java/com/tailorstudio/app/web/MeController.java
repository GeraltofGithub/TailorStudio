package com.tailorstudio.app.web;

import com.tailorstudio.app.domain.UserRole;
import com.tailorstudio.app.repo.BusinessRepository;
import com.tailorstudio.app.security.CurrentUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final CurrentUserService currentUserService;
    private final BusinessRepository businessRepository;

    public MeController(CurrentUserService currentUserService, BusinessRepository businessRepository) {
        this.currentUserService = currentUserService;
        this.businessRepository = businessRepository;
    }

    @GetMapping
    public Map<String, Object> me() {
        var u = currentUserService.requireUser();
        var business = businessRepository.findById(u.getBusinessId()).orElseThrow();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("email", u.getUsername());
        m.put("fullName", u.getFullName());
        m.put("role", u.getRole().name());
        m.put("businessId", business.getId());
        m.put("businessName", business.getName());
        m.put("tagline", business.getTagline());
        m.put("address", business.getAddress());
        m.put("phone", business.getPhone());
        m.put("secondaryPhone", business.getSecondaryPhone());
        if (u.getRole() == UserRole.OWNER) {
            m.put("joinCode", business.getJoinCode());
        }
        return m;
    }
}
