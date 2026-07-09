package com.ashalert.dto;

import jakarta.validation.constraints.*;

public record ReportRequest(
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @Size(max = 280) String note
) {}
