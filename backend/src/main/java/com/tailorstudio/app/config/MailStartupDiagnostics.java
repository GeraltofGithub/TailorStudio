package com.tailorstudio.app.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * One-line startup hint for production mail issues (no secrets logged).
 */
@Component
public class MailStartupDiagnostics {

    private static final Logger log = LoggerFactory.getLogger(MailStartupDiagnostics.class);

    private final Environment environment;
    private final ObjectProvider<JavaMailSender> mailSender;

    public MailStartupDiagnostics(Environment environment, ObjectProvider<JavaMailSender> mailSender) {
        this.environment = environment;
        this.mailSender = mailSender;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        boolean beanPresent = mailSender.getIfAvailable() != null;
        String email = environment.getProperty("EMAIL", "");
        int userLen = StringUtils.hasText(email) ? email.length() : 0;
        String pass = environment.getProperty("EMAIL_PASSWORD", "");
        boolean passSet = StringUtils.hasText(pass);
        String host = environment.getProperty("MAIL_HOST", environment.getProperty("spring.mail.host", ""));
        String port = environment.getProperty("MAIL_PORT", environment.getProperty("spring.mail.port", ""));
        boolean ssl = Boolean.parseBoolean(environment.getProperty("MAIL_SMTP_SSL", "false"));
        log.info(
                "SMTP: JavaMailSender bean={}, host={}, port={}, MAIL_SMTP_SSL={}, EMAIL length={}, EMAIL_PASSWORD set={}",
                beanPresent,
                host,
                port,
                ssl,
                userLen,
                passSet);
    }
}
