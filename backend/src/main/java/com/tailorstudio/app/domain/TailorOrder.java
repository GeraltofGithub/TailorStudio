package com.tailorstudio.app.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@JsonIgnoreProperties(value = {"business"}, allowSetters = true)
public class TailorOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id")
    private Business business;

    @Column(nullable = false)
    private Long serialNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GarmentType garmentType;

    @Column(columnDefinition = "CLOB")
    private String measurementSnapshotJson;

    @Column(nullable = false)
    private LocalDate orderDate;

    @Column(nullable = false)
    private LocalDate deliveryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal advanceAmount = BigDecimal.ZERO;

    @Column(length = 1000)
    private String notes;

    /** Cloth, lining, buttons, supplies — shown on work order. */
    @Column(length = 2000)
    private String materialsNotes;

    /** Customer special requests / fitting demands — shown on work order. */
    @Column(length = 2000)
    private String demandsNotes;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLine> lines = new ArrayList<>();

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    /** Set when status moves to DELIVERED (for daily income). */
    private Instant deliveredAt;

    /** When total due has been fully collected (advance &gt;= total). */
    private Instant paidInFullAt;

    /** Nullable in DB so Hibernate can add the column on existing rows; treat null as NONE in code. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = true, length = 32)
    private PaymentMethod lastPaymentMethod = PaymentMethod.NONE;

    /** Last PhonePe checkout merchant order id (for status sync after redirect). */
    @Column(length = 64)
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
