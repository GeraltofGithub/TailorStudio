package com.tailorstudio.app.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailSendException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class OtpMailAfterCommitListener {

    private static final Logger log = LoggerFactory.getLogger(OtpMailAfterCommitListener.class);

    private final StudioMailSender studioMailSender;
    private final ThreadPoolTaskExecutor mailExecutor;
    private final boolean asyncAfterCommit;

    public OtpMailAfterCommitListener(
            StudioMailSender studioMailSender,
            @Qualifier("taskExecutor") ThreadPoolTaskExecutor mailExecutor,
            @Value("${app.mail.async-after-commit:true}") boolean asyncAfterCommit) {
        this.studioMailSender = studioMailSender;
        this.mailExecutor = mailExecutor;
        this.asyncAfterCommit = asyncAfterCommit;
    }

    /**
     * After DB commit: send OTP mail. Default {@code app.mail.async-after-commit=true} returns HTTP quickly;
     * set {@code APP_MAIL_ASYNC_AFTER_COMMIT=false} on Render to surface SMTP errors as 503 on the same request.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendAfterCommit(OtpMailDispatchEvent event) {
        if (!studioMailSender.isConfigured()) {
            log.warn("Skip OTP email to {} — mail not configured", event.to());
            return;
        }
        if (asyncAfterCommit) {
            mailExecutor.execute(() -> sendMultipartSafe(event));
            return;
        }
        try {
            studioMailSender.sendMultipart(event.to(), event.subject(), event.plainText(), event.htmlBody());
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}", event.to(), e);
            throw new MailSendException("Failed to send OTP email", e);
        }
    }

    private void sendMultipartSafe(OtpMailDispatchEvent event) {
        try {
            studioMailSender.sendMultipart(event.to(), event.subject(), event.plainText(), event.htmlBody());
            log.info("OTP email sent to {}", event.to());
        } catch (Exception e) {
            log.error(
                    "OTP email FAILED to {} — check EMAIL/EMAIL_PASSWORD, Gmail app password, or try MAIL_SMTP_SSL=true and MAIL_PORT=465. Cause: {}",
                    event.to(),
                    e.getMessage());
        }
    }
}
