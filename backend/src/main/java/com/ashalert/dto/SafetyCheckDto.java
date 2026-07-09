package com.ashalert.dto;

import com.ashalert.model.SafetyStatus;

import java.util.List;

/** Response for "am I safe where I am standing?" lookups. */
public record SafetyCheckDto(
        String nearestArea,
        double distanceKm,
        SafetyStatus status,
        String maskGuidance,
        List<String> advice
) {}
