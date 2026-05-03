package com.tailorstudio.app.mail;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Sends multipart (plain + HTML) mail using the same SMTP config as the rest of the app.
 */
@Component
public class StudioMailSender {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String mailFrom;

    public StudioMailSender(ObjectProvider<JavaMailSender> mailSenderProvider, @Value("${spring.mail.username:}") String mailFrom) {
        this.mailSenderProvider = mailSenderProvider;
        this.mailFrom = mailFrom;
    }

    public boolean isConfigured() {
        return mailSenderProvider.getIfAvailable() != null && StringUtils.hasText(mailFrom);
    }

    public void sendMultipart(String to, String subject, String plainText, String htmlBody) throws Exception {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null || !StringUtils.hasText(mailFrom)) {
            throw new IllegalStateException("Mail is not configured.");
        }
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(mailFrom);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(plainText, htmlBody);
        sender.send(message);
    }
}
