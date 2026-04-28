package com.tailorstudio.app.web;

import com.tailorstudio.app.domain.PaymentMethod;
import com.tailorstudio.app.domain.TailorOrder;
import com.tailorstudio.app.dto.CashPaymentRequest;
import com.tailorstudio.app.payment.PhonePeProperties;
import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.OrderPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/orders/{orderId}/payments")
public class OrderPaymentController {

    private final CurrentUserService currentUserService;
    private final OrderPaymentService orderPaymentService;
    private final PhonePeProperties phonePeProperties;

    public OrderPaymentController(
            CurrentUserService currentUserService,
            OrderPaymentService orderPaymentService,
            PhonePeProperties phonePeProperties) {
        this.currentUserService = currentUserService;
        this.orderPaymentService = orderPaymentService;
        this.phonePeProperties = phonePeProperties;
    }

    @GetMapping("/info")
    public Map<String, Object> info(@PathVariable Long orderId) {
        var u = currentUserService.requireUser();
        TailorOrder o = orderPaymentService.getOrderForBusiness(u.getBusinessId(), orderId);
        BigDecimal balance = o.getTotalAmount().subtract(o.getAdvanceAmount()).max(BigDecimal.ZERO);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalAmount", o.getTotalAmount());
        m.put("advanceAmount", o.getAdvanceAmount());
        m.put("balanceDue", balance);
        m.put("paidInFull", o.getPaidInFullAt() != null || balance.compareTo(BigDecimal.ZERO) <= 0);
        m.put("paidInFullAt", o.getPaidInFullAt());
        m.put("lastPaymentMethod", o.getLastPaymentMethod() != null ? o.getLastPaymentMethod().name() : "NONE");
        m.put("phonePeConfigured", phonePeProperties.isEnabled() && phonePeProperties.hasCredentials());
        return m;
    }

    @PostMapping("/cash")
    public TailorOrder cash(@PathVariable Long orderId, @Valid @RequestBody CashPaymentRequest req) {
        var u = currentUserService.requireUser();
        return orderPaymentService.recordCash(u.getBusinessId(), orderId, req.amount());
    }

    /**
     * Mark order as fully paid (e.g. settled in cash without typing exact amount). Sets advance = total.
     */
    @PostMapping("/mark-paid")
    public TailorOrder markPaid(
            @PathVariable Long orderId, @RequestParam(defaultValue = "CASH") String method) {
        var u = currentUserService.requireUser();
        PaymentMethod pm;
        try {
            pm = PaymentMethod.valueOf(method.toUpperCase());
            if (pm != PaymentMethod.CASH && pm != PaymentMethod.ONLINE) {
                pm = PaymentMethod.CASH;
            }
        } catch (IllegalArgumentException e) {
            pm = PaymentMethod.CASH;
        }
        return orderPaymentService.markPaidInFull(u.getBusinessId(), orderId, pm);
    }

    @PostMapping("/phonepe/initiate")
    public ResponseEntity<?> phonePeInitiate(@PathVariable Long orderId) {
        var u = currentUserService.requireUser();
        try {
            OrderPaymentService.PhonePeInitiateResult r =
                    orderPaymentService.initiatePhonePeCheckout(u.getBusinessId(), orderId);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("redirectUrl", r.redirectUrl());
            body.put("merchantOrderId", r.merchantOrderId());
            body.put("phonePeOrderId", r.phonePeOrderId());
            return ResponseEntity.ok(body);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "PhonePe request failed: " + e.getMessage()));
        }
    }

    @PostMapping("/phonepe/sync")
    public TailorOrder phonePeSync(@PathVariable Long orderId) throws IOException, InterruptedException {
        var u = currentUserService.requireUser();
        return orderPaymentService.syncPhonePeStatus(u.getBusinessId(), orderId);
    }
}
