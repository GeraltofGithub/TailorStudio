package com.tailorstudio.app.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record MeasurementWriteRequest(
        @NotBlank String unit,
        Map<String, String> values) {}
