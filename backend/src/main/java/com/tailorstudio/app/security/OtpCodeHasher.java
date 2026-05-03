package com.tailorstudio.app.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Locale;

public final class OtpCodeHasher {

    private static final SecureRandom RANDOM = new SecureRandom();

    private OtpCodeHasher() {}

    public static String newSixDigitOtp() {
        int n = 100_000 + RANDOM.nextInt(900_000);
        return String.format("%06d", n);
    }

    public static String hashOtp(String pepper, String email, String code) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String payload = pepper + "\n" + email.trim().toLowerCase(Locale.ROOT) + "\n" + code.trim();
            return HexFormat.of().formatHex(md.digest(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        byte[] ab = a.getBytes(StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(StandardCharsets.UTF_8);
        if (ab.length != bb.length) {
            return false;
        }
        return MessageDigest.isEqual(ab, bb);
    }

    public static String randomTokenHex(int numBytes) {
        byte[] buf = new byte[numBytes];
        RANDOM.nextBytes(buf);
        return HexFormat.of().formatHex(buf);
    }

    public static String sha256Hex(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
