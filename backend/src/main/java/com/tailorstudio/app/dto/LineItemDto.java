package com.tailorstudio.app.dto;

import java.math.BigDecimal;

public record LineItemDto(String description, BigDecimal rate, BigDecimal amount) {}
