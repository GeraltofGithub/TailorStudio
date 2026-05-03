package com.tailorstudio.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(@NotBlank String resetToken, @NotBlank @Size(min = 8, max = 200) String newPassword) {}
