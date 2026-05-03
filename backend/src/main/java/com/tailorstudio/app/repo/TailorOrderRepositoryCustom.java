package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.OrderStatus;
import com.tailorstudio.app.domain.TailorOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public interface TailorOrderRepositoryCustom {
    long countActiveOrders(Long businessId, OrderStatus delivered);

    BigDecimal sumDeliveredIncomeBetween(Long businessId, OrderStatus delivered, Instant start, Instant end);

    List<TailorOrder> findDueBetweenWithDetails(LocalDate from, LocalDate to, OrderStatus delivered);

    List<TailorOrder> findListRowsByBusinessId(Long businessId);

    List<TailorOrder> findHistoryRowsByBusinessIdAndCustomerId(Long businessId, Long customerId);
}

