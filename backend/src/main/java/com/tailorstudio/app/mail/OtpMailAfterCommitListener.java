package com.tailorstudio.app.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailSendException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class OtpMailAfterCommitListener {

    private static final Logger log = LoggerFactory.getLogger(OtpMailAfterCommitListener.class);

    private final StudioMailSender studioMailSender;

    public OtpMailAfterCommitListener(StudioMailSender studioMailSender) {
        this.studioMailSender = studioMailSender;
    }

    /**
     * Synchronous after-commit so SMTP errors propagate to the HTTP client (no silent 200 when Gmail rejects).
     * Slightly slower API than async, but reliable on hosts like Render.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendAfterCommit(OtpMailDispatchEvent event) {
        if (!studioMailSender.isConfigured()) {
            log.warn("Skip OTP email to {} — mail not configured", event.to());
            return;
        }
        try {
            studioMailSender.sendMultipart(event.to(), event.subject(), event.plainText(), event.htmlBody());
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}", event.to(), e);
            throw new MailSendException("Failed to send OTP email", e);
        }
    }
}
