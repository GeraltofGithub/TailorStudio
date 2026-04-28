package com.tailorstudio.app.web;

import com.tailorstudio.app.domain.UserRole;
import com.tailorstudio.app.dto.BusinessUpdateRequest;
import com.tailorstudio.app.repo.BusinessRepository;
import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/business")
public class BusinessController {

    private final CurrentUserService currentUserService;
    private final BusinessRepository businessRepository;
    private final AuthService authService;

    public BusinessController(
            CurrentUserService currentUserService,
            BusinessRepository businessRepository,
            AuthService authService) {
        this.currentUserService = currentUserService;
        this.businessRepository = businessRepository;
        this.authService = authService;
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping
    public Map<String, String> update(@Valid @RequestBody BusinessUpdateRequest req) {
        var u = currentUserService.requireUser();
        var b = businessRepository.findById(u.getBusinessId()).orElseThrow();
        if (req.name() != null && !req.name().isBlank()) {
            b.setName(req.name().trim());
        }
        if (req.tagline() != null) {
            b.setTagline(req.tagline().isBlank() ? null : req.tagline().trim());
        }
        if (req.address() != null) {
            b.setAddress(req.address().isBlank() ? null : req.address().trim());
        }
        if (req.phone() != null) {
            b.setPhone(req.phone().isBlank() ? null : req.phone().trim());
        }
        if (req.secondaryPhone() != null) {
            b.setSecondaryPhone(req.secondaryPhone().isBlank() ? null : req.secondaryPhone().trim());
        }
        businessRepository.save(b);
        return Map.of("ok", "true");
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/rotate-join-code")
    public Map<String, String> rotateJoinCode() {
        var u = currentUserService.requireUser();
        if (u.getRole() != UserRole.OWNER) {
            throw new IllegalArgumentException("Only owners can rotate the code");
        }
        String code = authService.rotateJoinCode(u.getBusinessId());
        return Map.of("joinCode", code);
    }
}
