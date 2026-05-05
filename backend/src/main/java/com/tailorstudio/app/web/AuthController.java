package com.tailorstudio.app.web;

import com.tailorstudio.app.dto.StaffJoinRequest;
import com.tailorstudio.app.dto.StudioSignupRequest;
import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.AuthService;
import com.tailorstudio.app.service.UserSessionEpochService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUserService currentUserService;
    private final UserSessionEpochService userSessionEpochService;

    public AuthController(
            AuthService authService,
            CurrentUserService currentUserService,
            UserSessionEpochService userSessionEpochService) {
        this.authService = authService;
        this.currentUserService = currentUserService;
        this.userSessionEpochService = userSessionEpochService;
    }

    /** Invalidates JWTs by bumping {@code sessionEpoch} (same as “logged in elsewhere”). */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        var u = currentUserService.requireUser();
        userSessionEpochService.bumpEpoch(u.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@Valid @RequestBody StudioSignupRequest req) {
        authService.registerStudio(
                req.businessName(),
                req.tagline(),
                req.address(),
                req.phone(),
                req.secondaryPhone(),
                req.ownerName(),
                req.email(),
                req.password());
        return ResponseEntity.ok(Map.of("ok", true, "message", "Studio created. You can sign in now."));
    }

    @PostMapping("/staff-signup")
    public ResponseEntity<Map<String, Object>> staffSignup(@Valid @RequestBody StaffJoinRequest req) {
        authService.registerStaff(req.joinCode(), req.fullName(), req.email(), req.password());
        return ResponseEntity.ok(Map.of("ok", true, "message", "Account created. You can sign in now."));
    }
}
