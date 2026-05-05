package com.tailorstudio.app.web;

import com.tailorstudio.app.dto.LoginOtpResendRequest;
import com.tailorstudio.app.dto.LoginPasswordChallengeRequest;
import com.tailorstudio.app.dto.OtpEmailRequest;
import com.tailorstudio.app.dto.OtpLoginVerifyRequest;
import com.tailorstudio.app.dto.OtpVerifyRequest;
import com.tailorstudio.app.dto.PasswordResetRequest;
import com.tailorstudio.app.security.StudioUserDetails;
import com.tailorstudio.app.service.MePayloadService;
import com.tailorstudio.app.service.OtpAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/otp")
public class AuthOtpController {

    private final OtpAuthService otpAuthService;
    private final MePayloadService mePayloadService;

    public AuthOtpController(OtpAuthService otpAuthService, MePayloadService mePayloadService) {
        this.otpAuthService = otpAuthService;
        this.mePayloadService = mePayloadService;
    }

    /** Millisecond precision only — avoids JS Date parse issues with nanosecond ISO-8601 from {@link Instant#toString()}. */
    private static String expiresAtIso(Instant instant) {
        return instant.truncatedTo(ChronoUnit.MILLIS).toString();
    }

    @PostMapping("/login/challenge")
    public ResponseEntity<Map<String, Object>> loginChallenge(@Valid @RequestBody LoginPasswordChallengeRequest body) {
        try {
            var r = otpAuthService.startLoginWithPassword(body.email(), body.password());
            return ResponseEntity.ok(
                    Map.of(
                            "ok",
                            true,
                            "expiresAt",
                            expiresAtIso(r.expiresAt()),
                            "pendingToken",
                            r.pendingTokenPlain(),
                            "staticOtp",
                            otpAuthService.isStaticOtpBypassEnabled()));
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
            return ResponseEntity.ok(Map.of("ok", true, "expiresAt", expiresAtIso(exp)));
        } catch (OtpAuthService.OtpInvalidException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("ok", false, "error", "invalid_pending"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("ok", false, "error", "mail_not_configured", "message", e.getMessage()));
        }
    }

    @PostMapping("/login/verify")
    public ResponseEntity<?> loginVerify(@Valid @RequestBody OtpLoginVerifyRequest body) {
        try {
            var out = otpAuthService.verifyLoginOtp(body.email(), body.code(), body.pendingToken());
            var me = mePayloadService.buildFor(new StudioUserDetails(out.user()));
            return ResponseEntity.ok(Map.of("ok", true, "me", me, "accessToken", out.accessToken()));
        } catch (OtpAuthService.OtpInvalidException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("ok", false, "error", "invalid_otp"));
        }
    }

    @PostMapping("/forgot/send")
    public ResponseEntity<Map<String, Object>> sendForgot(@Valid @RequestBody OtpEmailRequest body) {
        try {
            var exp = otpAuthService.sendForgotPasswordOtp(body.email());
            return ResponseEntity.ok(Map.of("ok", true, "expiresAt", expiresAtIso(exp)));
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
