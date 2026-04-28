package com.tailorstudio.app.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * PhonePe Payment Gateway Standard Checkout (OAuth + create payment + order status).
 * Docs: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/
 */
@Component
public class PhonePeClient {

    private final PhonePeProperties props;
    private final ObjectMapper objectMapper;
    private final HttpClient http =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

    private volatile String cachedBearer;
    private volatile Instant tokenGoodUntil = Instant.EPOCH;

    public PhonePeClient(PhonePeProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
    }

    public boolean isReady() {
        return props.isEnabled() && props.hasCredentials();
    }

    public synchronized String getAuthorizationHeader() throws IOException, InterruptedException {
        if (cachedBearer != null && Instant.now().isBefore(tokenGoodUntil.minusSeconds(60))) {
            return "O-Bearer " + cachedBearer;
        }
        String form =
                Stream.of(
                                "client_id=" + url(props.getClientId()),
                                "client_version=" + url(props.getClientVersion()),
                                "client_secret=" + url(props.getClientSecret()),
                                "grant_type=" + url("client_credentials"))
                        .collect(Collectors.joining("&"));
        HttpRequest req =
                HttpRequest.newBuilder()
                        .uri(URI.create(props.oauthTokenUrl()))
                        .timeout(Duration.ofSeconds(25))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form))
                        .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            throw new IOException("PhonePe token HTTP " + res.statusCode() + ": " + res.body());
        }
        JsonNode root = objectMapper.readTree(res.body());
        cachedBearer = root.path("access_token").asText(null);
        if (cachedBearer == null || cachedBearer.isEmpty()) {
            throw new IOException("PhonePe token response missing access_token");
        }
        long exp = root.path("expires_at").asLong(0);
        if (exp > 0) {
            tokenGoodUntil = Instant.ofEpochSecond(exp);
        } else {
            tokenGoodUntil = Instant.now().plusSeconds(25 * 60);
        }
        return "O-Bearer " + cachedBearer;
    }

    public PhonePePayResult createCheckout(long amountPaisa, String merchantOrderId, String redirectUrl)
            throws IOException, InterruptedException {
        if (amountPaisa < 100) {
            throw new IllegalArgumentException("PhonePe minimum amount is 100 paise (₹1)");
        }
        String auth = getAuthorizationHeader();
        ObjectNode body = objectMapper.createObjectNode();
        body.put("merchantOrderId", merchantOrderId);
        body.put("amount", amountPaisa);
        body.put("expireAfter", 1800);
        ObjectNode flow = body.putObject("paymentFlow");
        flow.put("type", "PG_CHECKOUT");
        flow.put("message", "Tailor order payment");
        flow.putObject("merchantUrls").put("redirectUrl", redirectUrl);
        ObjectNode meta = body.putObject("metaInfo");
        meta.put("udf1", merchantOrderId);

        HttpRequest.Builder b =
                HttpRequest.newBuilder()
                        .uri(URI.create(props.checkoutPayUrl()))
                        .timeout(Duration.ofSeconds(30))
                        .header("Content-Type", "application/json")
                        .header("Authorization", auth)
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
        if (props.getMerchantId() != null && !props.getMerchantId().isBlank()) {
            b.header("X-MERCHANT-ID", props.getMerchantId());
        }
        HttpResponse<String> res = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            throw new IOException("PhonePe create payment HTTP " + res.statusCode() + ": " + res.body());
        }
        JsonNode root = objectMapper.readTree(res.body());
        String redirect = root.path("redirectUrl").asText(null);
        if (redirect == null || redirect.isEmpty()) {
            throw new IOException("PhonePe response missing redirectUrl: " + res.body());
        }
        String orderId = root.path("orderId").asText("");
        return new PhonePePayResult(redirect, orderId);
    }

    public JsonNode getOrderStatus(String merchantOrderId) throws IOException, InterruptedException {
        String auth = getAuthorizationHeader();
        HttpRequest.Builder b =
                HttpRequest.newBuilder()
                        .uri(URI.create(props.orderStatusUrl(merchantOrderId)))
                        .timeout(Duration.ofSeconds(25))
                        .header("Content-Type", "application/json")
                        .header("Authorization", auth)
                        .GET();
        if (props.getMerchantId() != null && !props.getMerchantId().isBlank()) {
            b.header("X-MERCHANT-ID", props.getMerchantId());
        }
        HttpResponse<String> res = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            throw new IOException("PhonePe status HTTP " + res.statusCode() + ": " + res.body());
        }
        return objectMapper.readTree(res.body());
    }

    private static String url(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }

    public record PhonePePayResult(String redirectUrl, String phonePeOrderId) {}
}
