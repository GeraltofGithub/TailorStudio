package com.tailorstudio.app.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.lang.NonNull;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Properties;

/**
 * When {@code MAIL_USE_STARTTLS=true}, use SMTP STARTTLS on port 587 (typical for Brevo, SendGrid, Mailgun).
 * Undoes implicit-SSL / socket-factory settings from {@code application-render.properties} so Render can reach
 * transactional SMTP on 587 without Gmail's blocked paths.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class MailStartTlsConfigurer implements BeanPostProcessor {

    private final Environment environment;

    public MailStartTlsConfigurer(Environment environment) {
        this.environment = environment;
    }

    @Override
    public Object postProcessAfterInitialization(@NonNull Object bean, @NonNull String beanName) throws BeansException {
        if (!(bean instanceof JavaMailSenderImpl impl)) {
            return bean;
        }
        if (!Boolean.parseBoolean(environment.getProperty("MAIL_USE_STARTTLS", "false"))) {
            return bean;
        }
        String host = StringUtils.hasText(impl.getHost())
                ? impl.getHost()
                : environment.getProperty("MAIL_HOST", "smtp-relay.brevo.com");
        impl.setHost(host.strip());
        int port = 587;
        String mailPort = environment.getProperty("MAIL_PORT");
        if (StringUtils.hasText(mailPort)) {
            try {
                port = Integer.parseInt(mailPort.strip());
            } catch (NumberFormatException ignored) {
                // keep 587
            }
        }
        impl.setPort(port);

        Properties props = impl.getJavaMailProperties();
        props.remove("mail.smtp.socketFactory.class");
        props.remove("mail.smtp.socketFactory.port");
        props.remove("mail.smtp.socketFactory.fallback");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.ssl.enable", "false");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.trust", host);
        props.put("mail.smtp.connectiontimeout", "45000");
        props.put("mail.smtp.timeout", "45000");
        props.put("mail.smtp.writetimeout", "45000");
        return impl;
    }
}
