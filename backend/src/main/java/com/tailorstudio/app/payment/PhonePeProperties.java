package com.tailorstudio.app.payment;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "phonepe")
public class PhonePeProperties {

    /** Set true and fill credentials to enable UPI / online checkout via PhonePe PG. */
    private boolean enabled = false;

    private boolean sandbox = true;

    private String clientId = "";
    private String clientVersion = "1";
    private String clientSecret = "";

    /**
     * Public origin of this application (scheme + host + port, no trailing slash).
     * Used to build PhonePe redirectUrl, e.g. https://your-domain.com
     */
    private String redirectBaseUrl = "http://localhost:8081";

    /** If PhonePe dashboard shows a separate Merchant ID for API headers. */
    private String merchantId = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isSandbox() {
        return sandbox;
    }

    public void setSandbox(boolean sandbox) {
        this.sandbox = sandbox;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientVersion() {
        return clientVersion;
    }

    public void setClientVersion(String clientVersion) {
        this.clientVersion = clientVersion;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getRedirectBaseUrl() {
        return redirectBaseUrl;
    }

    public void setRedirectBaseUrl(String redirectBaseUrl) {
        this.redirectBaseUrl = redirectBaseUrl;
    }

    public String getMerchantId() {
        return merchantId;
    }

    public void setMerchantId(String merchantId) {
        this.merchantId = merchantId;
    }

    public String oauthTokenUrl() {
        return sandbox
                ? "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"
                : "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
    }

    public String checkoutPayUrl() {
        return sandbox
                ? "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay"
                : "https://api.phonepe.com/apis/pg/checkout/v2/pay";
    }

    public String orderStatusUrl(String merchantOrderId) {
        String enc = java.net.URLEncoder.encode(merchantOrderId, java.nio.charset.StandardCharsets.UTF_8);
        return (sandbox
                        ? "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/"
                        : "https://api.phonepe.com/apis/pg/checkout/v2/order/")
                + enc
                + "/status?details=false&errorContext=false";
    }

    public boolean hasCredentials() {
        return clientId != null
                && !clientId.isBlank()
                && clientSecret != null
                && !clientSecret.isBlank();
    }
}
