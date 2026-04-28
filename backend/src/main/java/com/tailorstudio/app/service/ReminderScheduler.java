package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.OrderStatus;
import com.tailorstudio.app.domain.TailorOrder;
import com.tailorstudio.app.repo.BusinessRepository;
import com.tailorstudio.app.repo.CustomerRepository;
import com.tailorstudio.app.repo.TailorOrderRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

@Component
public class ReminderScheduler {

    private final TailorOrderRepository orderRepository;
    private final NotificationService notificationService;
    private final BusinessRepository businessRepository;
    private final CustomerRepository customerRepository;

    public ReminderScheduler(
            TailorOrderRepository orderRepository,
            NotificationService notificationService,
            BusinessRepository businessRepository,
            CustomerRepository customerRepository) {
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
        this.businessRepository = businessRepository;
        this.customerRepository = customerRepository;
    }

    /** Daily at 08:00 — remind about deliveries in the next 1–3 days (not yet delivered). */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void remindUpcomingDeliveries() {
        LocalDate today = LocalDate.now();
        LocalDate from = today.plusDays(1);
        LocalDate to = today.plusDays(3);
        var due = orderRepository.findDueBetweenWithDetails(from, to, OrderStatus.DELIVERED);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d");
        for (TailorOrder o : due) {
            long days = ChronoUnit.DAYS.between(today, o.getDeliveryDate());
            if (o.getCustomer() == null && o.getCustomerId() != null) {
                customerRepository.findById(o.getCustomerId()).ifPresent(o::setCustomer);
            }
            String msg = "Delivery in " + days + " day(s) (" + o.getDeliveryDate().format(fmt) + "): Order #"
                    + o.getSerialNumber() + " — " + o.getCustomer().getName();
            var business = o.getBusinessId() != null ? businessRepository.findById(o.getBusinessId()).orElse(null) : null;
            if (business != null) {
                notificationService.add(business, msg, o.getId());
            }
        }
    }
}
