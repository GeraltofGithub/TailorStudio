package com.tailorstudio.app.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

/**
 * Trims SMTP username. For password, removes all whitespace so Gmail app passwords can be pasted as
 * "xxxx xxxx xxxx xxxx" (display format) — Google expects the 16 characters with no spaces.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MailCredentialSanitizer implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(@NonNull Object bean, @NonNull String beanName) throws BeansException {
        if (bean instanceof JavaMailSenderImpl impl) {
            if (impl.getUsername() != null) {
                impl.setUsername(impl.getUsername().strip());
            }
            if (impl.getPassword() != null) {
                impl.setPassword(impl.getPassword().replaceAll("\\s+", ""));
            }
        }
        return bean;
    }
}
