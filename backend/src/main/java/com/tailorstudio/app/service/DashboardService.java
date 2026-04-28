package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.OrderStatus;
import com.tailorstudio.app.repo.TailorOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class DashboardService {

    private final TailorOrderRepository orderRepository;

    public DashboardService(TailorOrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public DashboardStats stats(Long businessId) {
        ZoneId zone = ZoneId.systemDefault();
        LocalDate today = LocalDate.now(zone);
        Instant start = today.atStartOfDay(zone).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(zone).toInstant();

        long totalOrders = orderRepository.countByBusinessId(businessId);
        long pendingDeliveries = orderRepository.countActiveOrders(businessId, OrderStatus.DELIVERED);
        BigDecimal dailyIncome = orderRepository.sumDeliveredIncomeBetween(
                businessId, OrderStatus.DELIVERED, start, end);

        return new DashboardStats(totalOrders, pendingDeliveries, dailyIncome);
    }

    public record DashboardStats(long totalOrders, long pendingDeliveries, BigDecimal dailyIncome) {}
}
