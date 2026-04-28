package com.tailorstudio.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudioSignupRequest(
        @NotBlank @Size(max = 200) String businessName,
        @Size(max = 300) String tagline,
        @Size(max = 500) String address,
        @Size(max = 50) String phone,
        @Size(max = 50) String secondaryPhone,
        @NotBlank @Size(max = 120) String ownerName,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100) String password) {}
