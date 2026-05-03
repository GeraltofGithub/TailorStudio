package com.tailorstudio.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginPasswordChallengeRequest(@NotBlank @Email String email, @NotBlank @Size(min = 1, max = 200) String password) {}
