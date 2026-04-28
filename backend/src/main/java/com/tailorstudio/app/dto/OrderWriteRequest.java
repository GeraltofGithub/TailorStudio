package com.tailorstudio.app.dto;

import com.tailorstudio.app.domain.GarmentType;
import com.tailorstudio.app.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record OrderWriteRequest(
        Long customerId,
        GarmentType garmentType,
        /** Saved as JSON; typically {@code { "unit": "INCH"|"CM", "values": { ... } }} */
        Object measurementSnapshot,
        LocalDate orderDate,
        LocalDate deliveryDate,
        OrderStatus status,
        BigDecimal advanceAmount,
        String notes,
        String materialsNotes,
        String demandsNotes,
        List<LineItemDto> lines) {}
