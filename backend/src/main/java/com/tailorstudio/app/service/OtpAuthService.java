package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.OtpChallenge;
import com.tailorstudio.app.domain.OtpPurpose;
import com.tailorstudio.app.domain.PasswordResetToken;
import com.tailorstudio.app.domain.PendingLogin;
import com.tailorstudio.app.domain.User;
import com.tailorstudio.app.mail.OtpMailDispatchEvent;
import com.tailorstudio.app.mail.StudioMailSender;
import com.tailorstudio.app.mail.StudioOtpEmailHtml;
import com.tailorstudio.app.repo.OtpChallengeRepository;
import com.tailorstudio.app.repo.PasswordResetTokenRepository;
import com.tailorstudio.app.repo.PendingLoginRepository;
import com.tailorstudio.app.repo.UserRepository;
import com.tailorstudio.app.security.OtpCodeHasher;
import com.tailorstudio.app.security.StudioUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
public class OtpAuthService {

    private static final Duration OTP_TTL = Duration.ofMinutes(2);
    private static final Duration PENDING_LOGIN_TTL = Duration.ofMinutes(10);
    private static final Duration RESET_TOKEN_TTL = Duration.ofMinutes(15);

    private final UserRepository userRepository;
    private final OtpChallengeRepository otpChallengeRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PendingLoginRepository pendingLoginRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;
    private final StudioMailSender studioMailSender;
    private final ApplicationEventPublisher eventPublisher;
    private final String otpPepper;
    private final String brandPublicUrl;

    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public OtpAuthService(
            UserRepository userRepository,
            OtpChallengeRepository otpChallengeRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PendingLoginRepository pendingLoginRepository,
            AuthService authService,
            PasswordEncoder passwordEncoder,
            StudioMailSender studioMailSender,
            ApplicationEventPublisher eventPublisher,
            @Value("${app.otp.pepper}") String otpPepper,
            @Value("${app.brand.public-url:}") String brandPublicUrl) {
        this.userRepository = userRepository;
        this.otpChallengeRepository = otpChallengeRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.pendingLoginRepository = pendingLoginRepository;
        this.authService = authService;
        this.passwordEncoder = passwordEncoder;
        this.studioMailSender = studioMailSender;
        this.eventPublisher = eventPublisher;
        this.otpPepper = otpPepper;
        this.brandPublicUrl = brandPublicUrl;
    }

    public boolean isMailConfigured() {
        return studioMailSender.isConfigured();
    }

    private void requireMail() {
        if (!studioMailSender.isConfigured()) {
            throw new IllegalStateException("Email is not configured (set EMAIL and EMAIL_PASSWORD).");
        }
    }

    private void enqueueOtpEmail(String to, String subject, String plainText, String htmlBody) {
        eventPublisher.publishEvent(new OtpMailDispatchEvent(to, subject, plainText, htmlBody));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    public record LoginChallengeResult(Instant expiresAt, String pendingTokenPlain) {}

    /** Validates email + password, persists challenge, then queues HTML email after commit (fast API). */
    @Transactional
    public LoginChallengeResult startLoginWithPassword(String emailRaw, String passwordRaw) {
        requireMail();
        String email = normalizeEmail(emailRaw);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            throw new NoSuchUserException();
        }
        if (!passwordEncoder.matches(passwordRaw, user.getPasswordHash())) {
            throw new BadPasswordException();
        }
        pendingLoginRepository.deleteByEmailIgnoreCase(email);
        String pendingTokenPlain = OtpCodeHasher.randomTokenHex(24);
        PendingLogin pl = new PendingLogin();
        pl.setId(new ObjectId().toHexString());
        pl.setEmail(email);
        pl.setUserId(user.getId());
        pl.setTokenHash(OtpCodeHasher.sha256Hex(pendingTokenPlain));
        pl.setExpiresAt(Instant.now().plus(PENDING_LOGIN_TTL));
        pendingLoginRepository.save(pl);
        String code = OtpCodeHasher.newSixDigitOtp();
        OtpChallenge c = persistChallenge(email, OtpPurpose.LOGIN, code);
        enqueueOtpEmail(
                user.getEmail(),
                "Tailor Studio — sign-in code",
                StudioOtpEmailHtml.loginPlain(code),
                StudioOtpEmailHtml.loginEmail(code, brandPublicUrl));
        return new LoginChallengeResult(c.getExpiresAt(), pendingTokenPlain);
    }

    @Transactional
    public Instant resendLoginOtp(String pendingTokenPlain) {
        requireMail();
        String th = OtpCodeHasher.sha256Hex(pendingTokenPlain.trim());
        PendingLogin pl = pendingLoginRepository.findByTokenHashAndExpiresAtAfter(th, Instant.now()).orElseThrow(OtpInvalidException::new);
        User user = userRepository.findById(pl.getUserId()).orElseThrow(OtpInvalidException::new);
        if (!normalizeEmail(user.getEmail()).equals(normalizeEmail(pl.getEmail()))) {
            throw new OtpInvalidException();
        }
        String email = normalizeEmail(pl.getEmail());
        String code = OtpCodeHasher.newSixDigitOtp();
        OtpChallenge c = persistChallenge(email, OtpPurpose.LOGIN, code);
        enqueueOtpEmail(
                user.getEmail(),
                "Tailor Studio — sign-in code",
                StudioOtpEmailHtml.loginPlain(code),
                StudioOtpEmailHtml.loginEmail(code, brandPublicUrl));
        return c.getExpiresAt();
    }

    @Transactional
    public Instant sendForgotPasswordOtp(String emailRaw) {
        requireMail();
        String email = normalizeEmail(emailRaw);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            throw new NoSuchUserException();
        }
        String code = OtpCodeHasher.newSixDigitOtp();
        OtpChallenge c = persistChallenge(email, OtpPurpose.PASSWORD_RESET, code);
        enqueueOtpEmail(
                user.getEmail(),
                "Tailor Studio — reset password",
                StudioOtpEmailHtml.passwordResetPlain(code),
                StudioOtpEmailHtml.passwordResetEmail(code, brandPublicUrl));
        return c.getExpiresAt();
    }

    private OtpChallenge persistChallenge(String email, OtpPurpose purpose, String code) {
        otpChallengeRepository.deleteByEmailIgnoreCaseAndPurpose(email, purpose);
        OtpChallenge c = new OtpChallenge();
        c.setId(new ObjectId().toHexString());
        c.setEmail(email);
        c.setPurpose(purpose);
        c.setCodeHash(OtpCodeHasher.hashOtp(otpPepper, email, code));
        c.setExpiresAt(Instant.now().plus(OTP_TTL));
        return otpChallengeRepository.save(c);
    }

    @Transactional
    public void verifyLoginOtp(String emailRaw, String code, String pendingTokenPlain, HttpServletRequest request, HttpServletResponse response) {
        String email = normalizeEmail(emailRaw);
        String th = OtpCodeHasher.sha256Hex(pendingTokenPlain.trim());
        PendingLogin pl = pendingLoginRepository.findByTokenHashAndExpiresAtAfter(th, Instant.now()).orElseThrow(OtpInvalidException::new);
        if (!normalizeEmail(pl.getEmail()).equals(email)) {
            throw new OtpInvalidException();
        }
        Instant now = Instant.now();
        OtpChallenge c = otpChallengeRepository
                .findTopByEmailIgnoreCaseAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(email, OtpPurpose.LOGIN, now)
                .orElse(null);
        if (c == null) {
            throw new OtpInvalidException();
        }
        String want = c.getCodeHash();
        String got = OtpCodeHasher.hashOtp(otpPepper, email, code.trim());
        if (!OtpCodeHasher.constantTimeEquals(want, got)) {
            throw new OtpInvalidException();
        }
        otpChallengeRepository.deleteById(c.getId());
        pendingLoginRepository.deleteById(pl.getId());
        User user = userRepository.findById(pl.getUserId()).orElseThrow();
        establishSession(user, request, response);
    }

    @Transactional
    public String verifyForgotOtpAndIssueResetToken(String emailRaw, String code) {
        String email = normalizeEmail(emailRaw);
        Instant now = Instant.now();
        OtpChallenge c = otpChallengeRepository
                .findTopByEmailIgnoreCaseAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(email, OtpPurpose.PASSWORD_RESET, now)
                .orElse(null);
        if (c == null) {
            throw new OtpInvalidException();
        }
        String want = c.getCodeHash();
        String got = OtpCodeHasher.hashOtp(otpPepper, email, code.trim());
        if (!OtpCodeHasher.constantTimeEquals(want, got)) {
            throw new OtpInvalidException();
        }
        otpChallengeRepository.deleteById(c.getId());
        User user = userRepository.findByEmail(email).orElseThrow();
        passwordResetTokenRepository.deleteByUserId(user.getId());
        String token = OtpCodeHasher.randomTokenHex(24);
        PasswordResetToken pr = new PasswordResetToken();
        pr.setId(new ObjectId().toHexString());
        pr.setUserId(user.getId());
        pr.setTokenHash(OtpCodeHasher.sha256Hex(token));
        pr.setExpiresAt(Instant.now().plus(RESET_TOKEN_TTL));
        passwordResetTokenRepository.save(pr);
        return token;
    }

    @Transactional
    public void resetPasswordWithToken(String tokenRaw, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }
        String th = OtpCodeHasher.sha256Hex(tokenRaw.trim());
        PasswordResetToken pr = passwordResetTokenRepository.findByTokenHashAndExpiresAtAfter(th, Instant.now()).orElseThrow(OtpInvalidException::new);
        authService.updatePasswordForUser(pr.getUserId(), newPassword);
        passwordResetTokenRepository.deleteById(pr.getId());
    }

    private void establishSession(User user, HttpServletRequest request, HttpServletResponse response) {
        HttpSession old = request.getSession(false);
        if (old != null) {
            old.invalidate();
        }
        HttpSession session = request.getSession(true);
        StudioUserDetails details = new StudioUserDetails(user);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    public static final class NoSuchUserException extends RuntimeException {}

    public static final class BadPasswordException extends RuntimeException {}

    public static final class OtpInvalidException extends RuntimeException {}
}
