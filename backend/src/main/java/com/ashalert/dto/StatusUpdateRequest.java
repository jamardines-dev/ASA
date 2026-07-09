package com.ashalert.dto;

import com.ashalert.model.SafetyStatus;
import jakarta.validation.constraints.NotNull;

public record StatusUpdateRequest(
        @NotNull SafetyStatus status,
        String source
) {}
