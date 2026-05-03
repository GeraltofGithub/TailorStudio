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
 * When {@code MAIL_SMTP_SSL=true}, switch to implicit SSL (default port 465). Set {@code MAIL_PORT} if needed.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class MailSmtpSslEnabler implements BeanPostProcessor {

    private final Environment environment;

    public MailSmtpSslEnabler(Environment environment) {
        this.environment = environment;
    }

    @Override
    public Object postProcessAfterInitialization(@NonNull Object bean, @NonNull String beanName) throws BeansException {
        if (!(bean instanceof JavaMailSenderImpl impl)) {
            return bean;
        }
        if (!Boolean.parseBoolean(environment.getProperty("MAIL_SMTP_SSL", "false"))) {
            return bean;
        }
        int port = 465;
        String mailPort = environment.getProperty("MAIL_PORT");
        if (StringUtils.hasText(mailPort)) {
            try {
                port = Integer.parseInt(mailPort.strip());
            } catch (NumberFormatException ignored) {
                // keep 465
            }
        }
        impl.setPort(port);
        Properties props = impl.getJavaMailProperties();
        props.put("mail.smtp.ssl.enable", "true");
        props.put("mail.smtp.starttls.enable", "false");
        String host = impl.getHost();
        props.put("mail.smtp.ssl.trust", StringUtils.hasText(host) ? host : "smtp.gmail.com");
        return impl;
    }
}
