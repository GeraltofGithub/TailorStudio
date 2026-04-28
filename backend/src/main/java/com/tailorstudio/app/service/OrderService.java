package com.tailorstudio.app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tailorstudio.app.domain.Business;
import com.tailorstudio.app.domain.Customer;
import com.tailorstudio.app.domain.OrderLine;
import com.tailorstudio.app.domain.OrderStatus;
import com.tailorstudio.app.domain.TailorOrder;
import com.tailorstudio.app.dto.LineItemDto;
import com.tailorstudio.app.dto.OrderWriteRequest;
import com.tailorstudio.app.mongo.SequenceService;
import com.tailorstudio.app.repo.BusinessRepository;
import com.tailorstudio.app.repo.CustomerRepository;
import com.tailorstudio.app.repo.TailorOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class OrderService {

    private final TailorOrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final BusinessRepository businessRepository;
    private final ObjectMapper objectMapper;
    private final SequenceService seq;

    public OrderService(
            TailorOrderRepository orderRepository,
            CustomerRepository customerRepository,
            BusinessRepository businessRepository,
            ObjectMapper objectMapper,
            SequenceService seq) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.businessRepository = businessRepository;
        this.objectMapper = objectMapper;
        this.seq = seq;
    }

    @Transactional(readOnly = true)
    public List<TailorOrder> list(Long businessId) {
        var out = orderRepository.findByBusinessIdOrderByCreatedAtDesc(businessId);
        hydrate(out);
        return out;
    }

    @Transactional(readOnly = true)
    public TailorOrder get(Long businessId, Long orderId) {
        TailorOrder o = orderRepository.findByIdAndBusinessId(orderId, businessId).orElseThrow();
        hydrateOne(o);
        return o;
    }

    @Transactional
    public TailorOrder create(Long businessId, OrderWriteRequest req) throws JsonProcessingException {
        if (req.customerId() == null || req.orderDate() == null || req.deliveryDate() == null) {
            throw new IllegalArgumentException("Customer, order date and delivery date are required");
        }
        Customer customer = customerRepository.findById(req.customerId()).orElseThrow();
        if (customer.getBusinessId() == null || !customer.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("Invalid customer");
        }
        Business business = businessRepository.findById(businessId).orElseThrow();
        long serial = seq.next("orderSerial:" + businessId);

        TailorOrder order = new TailorOrder();
        order.setId(seq.next("orders"));
        if (order.getMongoObjectId() == null || order.getMongoObjectId().isBlank()) {
            order.setMongoObjectId(new org.bson.types.ObjectId().toHexString());
        }
        order.setBusinessId(business.getId());
        order.setSerialNumber(serial);
        order.setCustomerId(customer.getId());
        order.setGarmentType(req.garmentType());
        order.setMeasurementSnapshotJson(snapshotJson(req));
        order.setOrderDate(req.orderDate());
        order.setDeliveryDate(req.deliveryDate());
        order.setStatus(req.status() != null ? req.status() : OrderStatus.PENDING);
        order.setAdvanceAmount(zeroIfNull(req.advanceAmount()));
        order.setNotes(req.notes());
        order.setMaterialsNotes(blankToNull(req.materialsNotes()));
        order.setDemandsNotes(blankToNull(req.demandsNotes()));
        applyLines(order, req.lines() != null ? req.lines() : List.of());
        order.setTotalAmount(sumLines(order.getLines()));

        if (order.getStatus() == OrderStatus.DELIVERED) {
            order.setDeliveredAt(Instant.now());
        }

        TailorOrder saved = orderRepository.save(order);
        saved.setBusiness(business);
        saved.setCustomer(customer);
        return saved;
    }

    @Transactional
    public TailorOrder update(Long businessId, Long orderId, OrderWriteRequest req) throws JsonProcessingException {
        if (req.customerId() == null || req.orderDate() == null || req.deliveryDate() == null) {
            throw new IllegalArgumentException("Customer, order date and delivery date are required");
        }
        TailorOrder order = get(businessId, orderId);
        OrderStatus previous = order.getStatus();

        Customer customer = customerRepository.findById(req.customerId()).orElseThrow();
        if (customer.getBusinessId() == null || !customer.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("Invalid customer");
        }

        order.setCustomerId(customer.getId());
        order.setGarmentType(req.garmentType());
        order.setMeasurementSnapshotJson(snapshotJson(req));
        order.setOrderDate(req.orderDate());
        order.setDeliveryDate(req.deliveryDate());
        if (req.status() != null) {
            order.setStatus(req.status());
        }
        order.setAdvanceAmount(zeroIfNull(req.advanceAmount()));
        order.setNotes(req.notes());
        order.setMaterialsNotes(blankToNull(req.materialsNotes()));
        order.setDemandsNotes(blankToNull(req.demandsNotes()));

        order.getLines().clear();
        applyLines(order, req.lines() != null ? req.lines() : List.of());
        order.setTotalAmount(sumLines(order.getLines()));

        if (previous != OrderStatus.DELIVERED && order.getStatus() == OrderStatus.DELIVERED) {
            order.setDeliveredAt(Instant.now());
        } else if (order.getStatus() != OrderStatus.DELIVERED) {
            order.setDeliveredAt(null);
        }

        TailorOrder saved = orderRepository.save(order);
        // hydrate transient fields for JSON response
        saved.setCustomer(customer);
        saved.setBusiness(businessRepository.findById(businessId).orElse(null));
        return saved;
    }

    private String snapshotJson(OrderWriteRequest req) throws JsonProcessingException {
        if (req.measurementSnapshot() == null) {
            return "{}";
        }
        return objectMapper.writeValueAsString(req.measurementSnapshot());
    }

    private void applyLines(TailorOrder order, List<LineItemDto> lines) {
        if (lines == null) {
            return;
        }
        for (LineItemDto dto : lines) {
            if (dto == null || dto.description() == null || dto.description().isBlank()) {
                continue;
            }
            OrderLine line = new OrderLine();
            line.setDescription(dto.description().trim());
            line.setRate(zeroIfNull(dto.rate()));
            line.setAmount(zeroIfNull(dto.amount()));
            order.getLines().add(line);
        }
    }

    private static BigDecimal sumLines(List<OrderLine> lines) {
        BigDecimal sum = BigDecimal.ZERO;
        for (OrderLine line : lines) {
            sum = sum.add(line.getAmount() != null ? line.getAmount() : BigDecimal.ZERO);
        }
        return sum;
    }

    private static BigDecimal zeroIfNull(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private void hydrate(List<TailorOrder> orders) {
        if (orders == null || orders.isEmpty()) return;
        // lightweight hydration; keep behavior similar to JPA joins for API responses
        for (TailorOrder o : orders) {
            hydrateOne(o);
        }
    }

    private void hydrateOne(TailorOrder o) {
        if (o == null) return;
        if (o.getBusinessId() != null) {
            businessRepository.findById(o.getBusinessId()).ifPresent(o::setBusiness);
        }
        if (o.getCustomerId() != null) {
            customerRepository.findById(o.getCustomerId()).ifPresent(o::setCustomer);
        }
    }
}
