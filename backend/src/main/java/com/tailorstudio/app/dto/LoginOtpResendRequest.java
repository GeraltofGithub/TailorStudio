package com.tailorstudio.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginOtpResendRequest(@NotBlank @Size(min = 48, max = 64) String pendingToken) {}
