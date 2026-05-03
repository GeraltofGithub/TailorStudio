package com.tailorstudio.app.web;

import com.tailorstudio.app.dto.LoginOtpResendRequest;
import com.tailorstudio.app.dto.LoginPasswordChallengeRequest;
import com.tailorstudio.app.dto.OtpEmailRequest;
import com.tailorstudio.app.dto.OtpLoginVerifyRequest;
import com.tailorstudio.app.dto.OtpVerifyRequest;
import com.tailorstudio.app.dto.PasswordResetRequest;
import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.MePayloadService;
import com.tailorstudio.app.service.OtpAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/otp")
public class AuthOtpController {

    private final OtpAuthService otpAuthService;
    private final CurrentUserService currentUserService;
    private final MePayloadService mePayloadService;

    public AuthOtpController(OtpAuthService otpAuthService, CurrentUserService currentUserService, MePayloadService mePayloadService) {
        this.otpAuthService = otpAuthService;
        this.currentUserService = currentUserService;
        this.mePayloadService = mePayloadService;
    }

    @PostMapping("/login/challenge")
    public ResponseEntity<Map<String, Object>> loginChallenge(@Valid @RequestBody LoginPasswordChallengeRequest body) {
        try {
            var r = otpAuthService.startLoginWithPassword(body.email(), body.password());
            return ResponseEntity.ok(
                    Map.of("ok", true, "expiresAt", r.expiresAt().toString(), "pendingToken", r.pendingTokenPlain()));
        } catch (OtpAuthService.NoSuchUserException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("ok", false, "error", "no_account"));
        } catch (OtpAuthService.BadPasswordException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("ok", false, "error", "invalid_credentials"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("ok", false, "error", "mail_not_configured", "message", e.getMessage()));
        }
    }

    @PostMapping("/login/resend")
    public ResponseEntity<Map<String, Object>> loginResend(@Valid @RequestBody LoginOtpResendRequest body) {
        try {
            var exp = otpAuthService.resendLoginOtp(body.pendingToken());
            return ResponseEntity.ok(Map.of("ok", true, "expiresAt", exp.toString()));
        } catch (OtpAuthService.OtpInvalidException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("ok", false, "error", "invalid_pending"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("ok", false, "error", "mail_not_configured", "message", e.getMessage()));
        }
    }

    @PostMapping("/login/verify")
    public ResponseEntity<?> loginVerify(
            @Valid @RequestBody OtpLoginVerifyRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        try {
            otpAuthService.verifyLoginOtp(body.email(), body.code(), body.pendingToken(), request, response);
            var me = mePayloadService.buildFor(currentUserService.requireUser());
            return ResponseEntity.ok(Map.of("ok", true, "me", me));
        } catch (OtpAuthService.OtpInvalidException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("ok", false, "error", "invalid_otp"));
        }
    }

    @PostMapping("/forgot/send")
    public ResponseEntity<Map<String, Object>> sendForgot(@Valid @RequestBody OtpEmailRequest body) {
        try {
            var exp = otpAuthService.sendForgotPasswordOtp(body.email());
            return ResponseEntity.ok(Map.of("ok", true, "expiresAt", exp.toString()));
        } catch (OtpAuthService.NoSuchUserException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("ok", false, "error", "no_account"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("ok", false, "error", "mail_not_configured", "message", e.getMessage()));
        }
    }

    @PostMapping("/forgot/verify")
    public ResponseEntity<Map<String, Object>> verifyForgot(@Valid @RequestBody OtpVerifyRequest body) {
        try {
            String token = otpAuthService.verifyForgotOtpAndIssueResetToken(body.email(), body.code());
            return ResponseEntity.ok(Map.of("ok", true, "resetToken", token));
        } catch (OtpAuthService.OtpInvalidException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("ok", false, "error", "invalid_otp"));
        }
    }

    @PostMapping("/forgot/reset")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody PasswordResetRequest body) {
        try {
            otpAuthService.resetPasswordWithToken(body.resetToken(), body.newPassword());
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (OtpAuthService.OtpInvalidException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("ok", false, "error", "invalid_reset_token"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "error", "validation", "message", e.getMessage()));
        }
    }
}
