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
import com.tailorstudio.app.security.JwtService;
import com.tailorstudio.app.security.OtpCodeHasher;
import jakarta.annotation.PostConstruct;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
public class OtpAuthService {

    private static final Logger log = LoggerFactory.getLogger(OtpAuthService.class);

    private static final Duration OTP_TTL = Duration.ofMinutes(2);
    private static final Duration PENDING_LOGIN_TTL = Duration.ofMinutes(10);
    private static final Duration RESET_TOKEN_TTL = Duration.ofMinutes(15);

    public record LoginVerifyOutcome(User user, String accessToken) {}

    private final UserRepository userRepository;
    private final OtpChallengeRepository otpChallengeRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PendingLoginRepository pendingLoginRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;
    private final StudioMailSender studioMailSender;
    private final UserAuthLookup userAuthLookup;
    private final ApplicationEventPublisher eventPublisher;
    private final UserSessionEpochService userSessionEpochService;
    private final JwtService jwtService;
    private final String otpPepper;
    private final String brandPublicUrl;
    private final boolean staticOtpEnabledRaw;
    private final String staticOtpCodeRaw;
    private boolean staticOtpActive;
    /** Exactly six digits from {@link #staticOtpCodeRaw}, used for comparison after {@link #initStaticOtp}. */
    private String staticOtpDigits = "";

    public OtpAuthService(
            UserRepository userRepository,
            OtpChallengeRepository otpChallengeRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PendingLoginRepository pendingLoginRepository,
            AuthService authService,
            PasswordEncoder passwordEncoder,
            StudioMailSender studioMailSender,
            UserAuthLookup userAuthLookup,
            ApplicationEventPublisher eventPublisher,
            UserSessionEpochService userSessionEpochService,
            JwtService jwtService,
            @Value("${app.otp.pepper}") String otpPepper,
            @Value("${app.brand.public-url:}") String brandPublicUrl,
            @Value("${app.otp.static-enabled:false}") boolean staticOtpEnabledRaw,
            @Value("${app.otp.static-code:}") String staticOtpCodeRaw) {
        this.userRepository = userRepository;
        this.otpChallengeRepository = otpChallengeRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.pendingLoginRepository = pendingLoginRepository;
        this.authService = authService;
        this.passwordEncoder = passwordEncoder;
        this.studioMailSender = studioMailSender;
        this.userAuthLookup = userAuthLookup;
        this.eventPublisher = eventPublisher;
        this.userSessionEpochService = userSessionEpochService;
        this.jwtService = jwtService;
        this.otpPepper = otpPepper;
        this.brandPublicUrl = brandPublicUrl;
        this.staticOtpEnabledRaw = staticOtpEnabledRaw;
        this.staticOtpCodeRaw = staticOtpCodeRaw;
    }

    @PostConstruct
    void initStaticOtp() {
        if (!staticOtpEnabledRaw) {
            staticOtpActive = false;
            staticOtpDigits = "";
            return;
        }
        String digits = staticOtpCodeRaw == null ? "" : staticOtpCodeRaw.replaceAll("\\D", "");
        if (!digits.matches("\\d{6}")) {
            log.error(
                    "STATIC_OTP_ENABLED is true but STATIC_OTP / app.otp.static-code is not exactly 6 digits — static OTP bypass disabled.");
            staticOtpActive = false;
            staticOtpDigits = "";
            return;
        }
        staticOtpDigits = digits;
        staticOtpActive = true;
        log.warn("STATIC OTP bypass is ON (code length 6). Do not use in production with real users.");
    }

    private boolean staticOtpBypass() {
        return staticOtpActive;
    }

    /** Exposed for login challenge JSON so the client can skip time-based OTP expiry UX when mail OTP is bypassed. */
    public boolean isStaticOtpBypassEnabled() {
        return staticOtpBypass();
    }

    private boolean isSubmittedStaticOtp(String codeRaw) {
        if (!staticOtpBypass() || codeRaw == null) {
            return false;
        }
        String submitted = codeRaw.replaceAll("\\D", "");
        return staticOtpDigits.equals(submitted);
    }

    public boolean isMailConfigured() {
        return studioMailSender.isConfigured();
    }

    private void requireMailUnlessStaticBypass() {
        if (staticOtpBypass()) {
            return;
        }
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

    @Transactional
    public LoginChallengeResult startLoginWithPassword(String emailRaw, String passwordRaw) {
        requireMailUnlessStaticBypass();
        User user = userAuthLookup.findByEmailFlexible(emailRaw).orElse(null);
        if (user == null) {
            throw new NoSuchUserException();
        }
        if (!passwordEncoder.matches(passwordRaw, user.getPasswordHash())) {
            throw new BadPasswordException();
        }
        String email = normalizeEmail(user.getEmail());
        pendingLoginRepository.deleteByEmailIgnoreCase(email);
        String pendingTokenPlain = OtpCodeHasher.randomTokenHex(24);
        PendingLogin pl = new PendingLogin();
        pl.setId(new ObjectId().toHexString());
        pl.setEmail(email);
        pl.setUserId(user.getId());
        pl.setTokenHash(OtpCodeHasher.sha256Hex(pendingTokenPlain));
        pl.setExpiresAt(Instant.now().plus(PENDING_LOGIN_TTL));
        pendingLoginRepository.save(pl);
        Instant expiresAt = Instant.now().plus(OTP_TTL);
        if (!staticOtpBypass()) {
            String code = OtpCodeHasher.newSixDigitOtp();
            OtpChallenge c = persistChallenge(email, OtpPurpose.LOGIN, code);
            expiresAt = c.getExpiresAt();
            enqueueOtpEmail(
                    user.getEmail(),
                    "Tailor Studio — sign-in code",
                    StudioOtpEmailHtml.loginPlain(code),
                    StudioOtpEmailHtml.loginEmail(code, brandPublicUrl));
        }
        return new LoginChallengeResult(expiresAt.truncatedTo(ChronoUnit.MILLIS), pendingTokenPlain);
    }

    @Transactional
    public Instant resendLoginOtp(String pendingTokenPlain) {
        requireMailUnlessStaticBypass();
        String th = OtpCodeHasher.sha256Hex(pendingTokenPlain.trim());
        PendingLogin pl = pendingLoginRepository.findByTokenHashAndExpiresAtAfter(th, Instant.now()).orElseThrow(OtpInvalidException::new);
        User user = userRepository.findById(pl.getUserId()).orElseThrow(OtpInvalidException::new);
        if (!normalizeEmail(user.getEmail()).equals(normalizeEmail(pl.getEmail()))) {
            throw new OtpInvalidException();
        }
        String email = normalizeEmail(pl.getEmail());
        if (staticOtpBypass()) {
            return Instant.now().plus(OTP_TTL);
        }
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
        requireMailUnlessStaticBypass();
        User user = userAuthLookup.findByEmailFlexible(emailRaw).orElse(null);
        if (user == null) {
            throw new NoSuchUserException();
        }
        String email = normalizeEmail(user.getEmail());
        if (staticOtpBypass()) {
            return Instant.now().plus(OTP_TTL);
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
    public LoginVerifyOutcome verifyLoginOtp(String emailRaw, String code, String pendingTokenPlain) {
        String email = normalizeEmail(emailRaw);
        String th = OtpCodeHasher.sha256Hex(pendingTokenPlain.trim());
        PendingLogin pl = pendingLoginRepository.findByTokenHashAndExpiresAtAfter(th, Instant.now()).orElseThrow(OtpInvalidException::new);
        if (!normalizeEmail(pl.getEmail()).equals(email)) {
            throw new OtpInvalidException();
        }
        Instant now = Instant.now();
        if (isSubmittedStaticOtp(code)) {
            otpChallengeRepository.deleteByEmailIgnoreCaseAndPurpose(email, OtpPurpose.LOGIN);
            pendingLoginRepository.deleteById(pl.getId());
            User user = userRepository.findById(pl.getUserId()).orElseThrow();
            return issueLoginTokens(user);
        }
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
        return issueLoginTokens(user);
    }

    private LoginVerifyOutcome issueLoginTokens(User user) {
        long epoch = userSessionEpochService.bumpEpoch(user.getId());
        User refreshed = userRepository.findById(user.getId()).orElse(user);
        String accessToken = jwtService.createAccessToken(refreshed.getId(), epoch);
        return new LoginVerifyOutcome(refreshed, accessToken);
    }

    @Transactional
    public String verifyForgotOtpAndIssueResetToken(String emailRaw, String code) {
        String email = normalizeEmail(emailRaw);
        if (isSubmittedStaticOtp(code)) {
            User user = userAuthLookup.findByEmailFlexible(emailRaw).orElseThrow(OtpInvalidException::new);
            if (!normalizeEmail(user.getEmail()).equals(normalizeEmail(emailRaw))) {
                throw new OtpInvalidException();
            }
            otpChallengeRepository.deleteByEmailIgnoreCaseAndPurpose(email, OtpPurpose.PASSWORD_RESET);
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
        User user = userAuthLookup.findByEmailFlexible(emailRaw).orElseThrow();
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

    public static final class NoSuchUserException extends RuntimeException {}

    public static final class BadPasswordException extends RuntimeException {}

    public static final class OtpInvalidException extends RuntimeException {}
}
