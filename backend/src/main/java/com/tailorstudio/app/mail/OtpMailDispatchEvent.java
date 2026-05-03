package com.tailorstudio.app.mail;

/**
 * Published from {@code @Transactional} OTP flows; handled after commit so HTTP is not blocked on SMTP.
 */
public record OtpMailDispatchEvent(String to, String subject, String plainText, String htmlBody) {}
