package com.tailorstudio.app.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CashPaymentRequest(@NotNull @DecimalMin("0.01") BigDecimal amount) {}
