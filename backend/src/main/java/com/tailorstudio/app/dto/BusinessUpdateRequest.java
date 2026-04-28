package com.tailorstudio.app.dto;

import jakarta.validation.constraints.Size;

public record BusinessUpdateRequest(
        @Size(max = 200) String name,
        @Size(max = 300) String tagline,
        @Size(max = 500) String address,
        @Size(max = 50) String phone,
        @Size(max = 50) String secondaryPhone) {}
