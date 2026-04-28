package com.tailorstudio.app.dto;

import com.tailorstudio.app.domain.GarmentType;

import java.time.Instant;

public record MeasurementResponse(Long id, GarmentType garmentType, String dataJson, Instant updatedAt) {}
