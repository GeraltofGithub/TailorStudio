package com.tailorstudio.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StaffJoinRequest(
        @NotBlank @Size(min = 8, max = 64) String joinCode,
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100) String password) {}
