package com.tailorstudio.app.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "customers")
@JsonIgnoreProperties(value = {"business"}, allowSetters = true)
public class Customer {

    @Id
    private Long id;

    private Long businessId;

    @Transient
    private Business business;

    private String name;

    private String phone;

    private String address;

    private MeasurementUnit preferredUnit = MeasurementUnit.INCH;

    private Instant createdAt = Instant.now();

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public MeasurementUnit getPreferredUnit() {
        return preferredUnit;
    }

    public void setPreferredUnit(MeasurementUnit preferredUnit) {
        this.preferredUnit = preferredUnit != null ? preferredUnit : MeasurementUnit.INCH;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
