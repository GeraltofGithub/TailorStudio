package com.tailorstudio.app.mail;

import org.springframework.web.util.HtmlUtils;

/**
 * Inline HTML for email clients; palette matches {@code frontend/src/styles/style.css} (teal + gold card).
 */
public final class StudioOtpEmailHtml {

    /** App shell background */
    private static final String BG_PAGE = "#eef2f4";
    /** Card surface */
    private static final String BG_CARD = "#f9fbfc";
    /** Primary text */
    private static final String TEXT = "#1a2f35";
    /** Muted copy */
    private static final String MUTED = "#5b7178";
    /** Teal accent (links, header bar) */
    private static final String TEAL = "#2f7f7b";
    /** Primary button gradient (matches .btn-primary) */
    private static final String GOLD_A = "#b48c3a";
    private static final String GOLD_B = "#967028";
    /** OTP digit cell */
    private static final String OTP_CELL_BG = "#ffffff";
    private static final String OTP_CELL_TEXT = "#000000";
    private static final String OTP_BORDER = "#c9ced6";

    private StudioOtpEmailHtml() {}

    public static String wrapBody(String innerHtml) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                  <title>Tailor Studio</title>
                </head>
                <body style="margin:0;padding:0;background:%s;font-family:system-ui,Segoe UI,Roboto,sans-serif;">
                %s
                </body>
                </html>
                """
                .formatted(BG_PAGE, innerHtml);
    }

    /** Six separate digit boxes (visual parity with in-app OTP UI). */
    public static String otpDigitRow(String sixDigitCode) {
        String digits = sixDigitCode == null ? "" : sixDigitCode.replaceAll("\\D", "");
        if (digits.length() > 6) {
            digits = digits.substring(0, 6);
        }
        StringBuilder sb = new StringBuilder();
        sb.append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"8\" style=\"margin:20px auto;border-collapse:separate;\"><tr>");
        for (int i = 0; i < 6; i++) {
            String ch = i < digits.length() ? String.valueOf(digits.charAt(i)) : "&nbsp;";
            sb.append(
                    "<td style=\"width:44px;height:48px;text-align:center;vertical-align:middle;"
                            + "font-size:22px;font-weight:600;font-family:ui-monospace,Consolas,monospace;"
                            + "background:%s;color:%s;border:1px solid %s;border-radius:8px;\">%s</td>"
                            .formatted(OTP_CELL_BG, OTP_CELL_TEXT, OTP_BORDER, ch));
        }
        sb.append("</tr></table>");
        return sb.toString();
    }

    public static String loginEmail(String code, String publicAppUrl) {
        String safeUrl = publicAppUrl == null ? "" : HtmlUtils.htmlEscape(publicAppUrl.trim());
        String inner =
                """
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:%s;padding:32px 16px;">
                  <tr><td align="center">
                    <table role="presentation" width="100%%" style="max-width:520px;background:%s;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.06);">
                      <tr><td style="height:6px;background:linear-gradient(135deg,%s,%s);"></td></tr>
                      <tr><td style="padding:28px 28px 8px 28px;">
                        <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:%s;font-weight:600;">Tailor Studio</p>
                        <h1 style="margin:12px 0 8px 0;font-size:24px;font-weight:600;color:%s;line-height:1.25;">Your sign-in code</h1>
                        <p style="margin:0 0 4px 0;font-size:15px;line-height:1.5;color:%s;">Use this code to finish signing in. It expires in <strong style="color:%s;">2 minutes</strong>.</p>
                      </td></tr>
                      <tr><td style="padding:0 28px;">%s</td></tr>
                      <tr><td style="padding:16px 28px 28px 28px;">
                        <p style="margin:0;font-size:13px;line-height:1.55;color:%s;">If you did not try to sign in, you can ignore this email.</p>
                        %s
                      </td></tr>
                    </table>
                  </td></tr>
                </table>
                """
                        .formatted(
                                BG_PAGE,
                                BG_CARD,
                                GOLD_A,
                                GOLD_B,
                                TEAL,
                                TEXT,
                                MUTED,
                                TEAL,
                                otpDigitRow(code),
                                MUTED,
                                footerLink(safeUrl));
        return wrapBody(inner);
    }

    public static String loginPlain(String code) {
        return "Tailor Studio — sign-in code\n\n"
                + "Your code: "
                + code
                + "\n\nThis code expires in 2 minutes. If you did not request it, ignore this email.";
    }

    public static String passwordResetEmail(String code, String publicAppUrl) {
        String safeUrl = publicAppUrl == null ? "" : HtmlUtils.htmlEscape(publicAppUrl.trim());
        String inner =
                """
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:%s;padding:32px 16px;">
                  <tr><td align="center">
                    <table role="presentation" width="100%%" style="max-width:520px;background:%s;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.06);">
                      <tr><td style="height:6px;background:linear-gradient(135deg,%s,%s);"></td></tr>
                      <tr><td style="padding:28px 28px 8px 28px;">
                        <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:%s;font-weight:600;">Tailor Studio</p>
                        <h1 style="margin:12px 0 8px 0;font-size:24px;font-weight:600;color:%s;line-height:1.25;">Reset your password</h1>
                        <p style="margin:0 0 4px 0;font-size:15px;line-height:1.5;color:%s;">Enter this code on the reset screen. It expires in <strong style="color:%s;">2 minutes</strong>.</p>
                      </td></tr>
                      <tr><td style="padding:0 28px;">%s</td></tr>
                      <tr><td style="padding:16px 28px 28px 28px;">
                        <p style="margin:0;font-size:13px;line-height:1.55;color:%s;">If you did not request a password reset, ignore this email.</p>
                        %s
                      </td></tr>
                    </table>
                  </td></tr>
                </table>
                """
                        .formatted(
                                BG_PAGE,
                                BG_CARD,
                                GOLD_A,
                                GOLD_B,
                                TEAL,
                                TEXT,
                                MUTED,
                                TEAL,
                                otpDigitRow(code),
                                MUTED,
                                footerLink(safeUrl));
        return wrapBody(inner);
    }

    public static String passwordResetPlain(String code) {
        return "Tailor Studio — password reset\n\n"
                + "Your code: "
                + code
                + "\n\nThis code expires in 2 minutes. If you did not request it, ignore this email.";
    }

    private static String footerLink(String safeEscapedUrl) {
        if (safeEscapedUrl == null || safeEscapedUrl.isEmpty()) {
            return "";
        }
        return "<p style=\"margin:16px 0 0 0;font-size:13px;\"><a href=\""
                + safeEscapedUrl
                + "\" style=\"color:"
                + TEAL
                + ";font-weight:600;text-decoration:none;\">Open Tailor Studio</a></p>";
    }
}
