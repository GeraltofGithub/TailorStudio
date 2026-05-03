package com.tailorstudio.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record OtpEmailRequest(@NotBlank @Email String email) {}
