package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.UserRole;
import com.tailorstudio.app.repo.BusinessRepository;
import com.tailorstudio.app.security.StudioUserDetails;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/** Shared shape for {@code GET /api/me} and post-login OTP verify (saves one client round trip). */
@Service
public class MePayloadService {

    private final BusinessRepository businessRepository;

    public MePayloadService(BusinessRepository businessRepository) {
        this.businessRepository = businessRepository;
    }

    public Map<String, Object> buildFor(StudioUserDetails u) {
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
