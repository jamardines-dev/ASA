package com.ashalert.dto;

import com.ashalert.model.SafetyStatus;

import java.time.Instant;

/** What the map consumes: one record per area, ready to render. */
public record AreaStatusDto(
        Long id,
        String name,
        double latitude,
        double longitude,
        SafetyStatus status,
        String maskGuidance,
        String source,
        Instant updatedAt,
        long recentReportCount
) {}
