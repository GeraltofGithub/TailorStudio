package com.tailorstudio.app.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "orders")
@JsonIgnoreProperties(value = {"business"}, allowSetters = true)
public class TailorOrder {

    @Id
    private Long id;

    @Indexed
    private Long businessId;

    @Transient
    private Business business;

    private Long serialNumber;

    @Indexed
    private Long customerId;

    @Transient
    private Customer customer;

    private GarmentType garmentType;

    private String measurementSnapshotJson;

    private LocalDate orderDate;

    private LocalDate deliveryDate;

    private OrderStatus status = OrderStatus.PENDING;

    private BigDecimal totalAmount = BigDecimal.ZERO;

    private BigDecimal advanceAmount = BigDecimal.ZERO;

    private String notes;

    /** Cloth, lining, buttons, supplies — shown on work order. */
    private String materialsNotes;

    /** Customer special requests / fitting demands — shown on work order. */
    private String demandsNotes;

    private List<OrderLine> lines = new ArrayList<>();

    private Instant createdAt = Instant.now();

    /** Set when status moves to DELIVERED (for daily income). */
    private Instant deliveredAt;

    /** When total due has been fully collected (advance &gt;= total). */
    private Instant paidInFullAt;

    /** Nullable in DB so Hibernate can add the column on existing rows; treat null as NONE in code. */
    private PaymentMethod lastPaymentMethod = PaymentMethod.NONE;

    /** Last PhonePe checkout merchant order id (for status sync after redirect). */
    private String phonePeMerchantOrderId;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Business getBusiness() {
        return business;
    }

    public void setBusiness(Business business) {
        this.business = business;
        this.businessId = business != null ? business.getId() : null;
    }

    public Long getBusinessId() {
        return businessId;
    }

    public void setBusinessId(Long businessId) {
        this.businessId = businessId;
    }

    public Long getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(Long serialNumber) {
        this.serialNumber = serialNumber;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
        this.customerId = customer != null ? customer.getId() : null;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public GarmentType getGarmentType() {
        return garmentType;
    }

    public void setGarmentType(GarmentType garmentType) {
        this.garmentType = garmentType;
    }

    public String getMeasurementSnapshotJson() {
        return measurementSnapshotJson;
    }

    public void setMeasurementSnapshotJson(String measurementSnapshotJson) {
        this.measurementSnapshotJson = measurementSnapshotJson;
    }

    public LocalDate getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDate orderDate) {
        this.orderDate = orderDate;
    }

    public LocalDate getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(LocalDate deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getAdvanceAmount() {
        return advanceAmount;
    }

    public void setAdvanceAmount(BigDecimal advanceAmount) {
        this.advanceAmount = advanceAmount;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getMaterialsNotes() {
        return materialsNotes;
    }

    public void setMaterialsNotes(String materialsNotes) {
        this.materialsNotes = materialsNotes;
    }

    public String getDemandsNotes() {
        return demandsNotes;
    }

    public void setDemandsNotes(String demandsNotes) {
        this.demandsNotes = demandsNotes;
    }

    public List<OrderLine> getLines() {
        return lines;
    }

    public void setLines(List<OrderLine> lines) {
        this.lines = lines;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(Instant deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public Instant getPaidInFullAt() {
        return paidInFullAt;
    }

    public void setPaidInFullAt(Instant paidInFullAt) {
        this.paidInFullAt = paidInFullAt;
    }

    public PaymentMethod getLastPaymentMethod() {
        return lastPaymentMethod != null ? lastPaymentMethod : PaymentMethod.NONE;
    }

    public void setLastPaymentMethod(PaymentMethod lastPaymentMethod) {
        this.lastPaymentMethod = lastPaymentMethod != null ? lastPaymentMethod : PaymentMethod.NONE;
    }

    public String getPhonePeMerchantOrderId() {
        return phonePeMerchantOrderId;
    }

    public void setPhonePeMerchantOrderId(String phonePeMerchantOrderId) {
        this.phonePeMerchantOrderId = phonePeMerchantOrderId;
    }
}
