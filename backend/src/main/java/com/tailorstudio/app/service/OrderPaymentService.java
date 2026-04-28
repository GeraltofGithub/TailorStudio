package com.tailorstudio.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.tailorstudio.app.domain.OrderStatus;
import com.tailorstudio.app.domain.PaymentMethod;
import com.tailorstudio.app.domain.TailorOrder;
import com.tailorstudio.app.payment.PhonePeClient;
import com.tailorstudio.app.payment.PhonePeProperties;
import com.tailorstudio.app.repo.TailorOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

@Service
public class OrderPaymentService {

    private final TailorOrderRepository orderRepository;
    private final PhonePeClient phonePeClient;
    private final PhonePeProperties phonePeProperties;

    public OrderPaymentService(
            TailorOrderRepository orderRepository,
            PhonePeClient phonePeClient,
            PhonePeProperties phonePeProperties) {
        this.orderRepository = orderRepository;
        this.phonePeClient = phonePeClient;
        this.phonePeProperties = phonePeProperties;
    }

    @Transactional(readOnly = true)
    public TailorOrder getOrderForBusiness(Long businessId, Long orderId) {
        return requireOrder(businessId, orderId);
    }

    @Transactional
    public TailorOrder recordCash(Long businessId, Long orderId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        TailorOrder order = requireOrder(businessId, orderId);
        BigDecimal balance = balance(order);
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("No balance due for this order");
        }
        BigDecimal applied = amount.min(balance);
        order.setAdvanceAmount(order.getAdvanceAmount().add(applied));
        order.setLastPaymentMethod(PaymentMethod.CASH);
        refreshPaidState(order);
        refreshDeliveryState(order);
        return orderRepository.save(order);
    }

    /** Sets advance to total (e.g. customer paid offline in full without exact denomination entry). */
    @Transactional
    public TailorOrder markPaidInFull(Long businessId, Long orderId, PaymentMethod method) {
        TailorOrder order = requireOrder(businessId, orderId);
        if (order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Order total is zero");
        }
        order.setAdvanceAmount(order.getTotalAmount());
        order.setLastPaymentMethod(method != null ? method : PaymentMethod.CASH);
        refreshPaidState(order);
        refreshDeliveryState(order);
        return orderRepository.save(order);
    }

    @Transactional
    public PhonePeInitiateResult initiatePhonePeCheckout(Long businessId, Long orderId)
            throws IOException, InterruptedException {
        if (!phonePeClient.isReady()) {
            throw new IllegalStateException(
                    "PhonePe is not configured. Set phonepe.enabled=true and credentials in application.properties.");
        }
        TailorOrder order = requireOrder(businessId, orderId);
        BigDecimal balance = balance(order);
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("No balance due for this order");
        }
        long paisa =
                balance.multiply(new BigDecimal("100")).setScale(0, RoundingMode.HALF_UP).longValueExact();
        if (paisa < 100) {
            throw new IllegalStateException("Balance must be at least ₹1 for PhonePe");
        }
        String merchantOrderId = "O" + orderId + "T" + System.currentTimeMillis();
        if (merchantOrderId.length() > 63) {
            merchantOrderId = merchantOrderId.substring(0, 63);
        }
        String base = phonePeProperties.getRedirectBaseUrl().replaceAll("/$", "");
        String redirectUrl = base + "/app/phonepe-return.html?orderId=" + orderId;
        order.setPhonePeMerchantOrderId(merchantOrderId);
        orderRepository.save(order);

        PhonePeClient.PhonePePayResult pay = phonePeClient.createCheckout(paisa, merchantOrderId, redirectUrl);
        return new PhonePeInitiateResult(pay.redirectUrl(), merchantOrderId, pay.phonePeOrderId());
    }

    @Transactional
    public TailorOrder syncPhonePeStatus(Long businessId, Long orderId) throws IOException, InterruptedException {
        if (!phonePeClient.isReady()) {
            throw new IllegalStateException("PhonePe is not configured");
        }
        TailorOrder order = requireOrder(businessId, orderId);
        String mid = order.getPhonePeMerchantOrderId();
        if (mid == null || mid.isBlank()) {
            throw new IllegalStateException("No PhonePe checkout found for this order");
        }
        JsonNode status = phonePeClient.getOrderStatus(mid);
        String state = status.path("state").asText("");
        if ("COMPLETED".equals(state)) {
            order.setAdvanceAmount(order.getTotalAmount());
            order.setLastPaymentMethod(PaymentMethod.ONLINE);
            refreshPaidState(order);
            refreshDeliveryState(order);
            return orderRepository.save(order);
        }
        return order;
    }

    private TailorOrder requireOrder(Long businessId, Long orderId) {
        TailorOrder order =
                orderRepository.findByIdAndBusinessId(orderId, businessId).orElseThrow();
        return order;
    }

    private static BigDecimal balance(TailorOrder order) {
        return order.getTotalAmount().subtract(order.getAdvanceAmount()).max(BigDecimal.ZERO);
    }

    private static void refreshPaidState(TailorOrder order) {
        if (order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        if (order.getAdvanceAmount().compareTo(order.getTotalAmount()) >= 0) {
            if (order.getPaidInFullAt() == null) {
                order.setPaidInFullAt(Instant.now());
            }
        } else {
            order.setPaidInFullAt(null);
        }
    }

    /** Mark delivered automatically once order is fully paid. */
    private static void refreshDeliveryState(TailorOrder order) {
        if (order.getPaidInFullAt() != null && order.getStatus() != OrderStatus.DELIVERED) {
            order.setStatus(OrderStatus.DELIVERED);
            if (order.getDeliveredAt() == null) {
                order.setDeliveredAt(Instant.now());
            }
        }
    }

    public record PhonePeInitiateResult(String redirectUrl, String merchantOrderId, String phonePeOrderId) {}
}
