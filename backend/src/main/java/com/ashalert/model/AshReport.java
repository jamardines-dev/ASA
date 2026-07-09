package com.ashalert.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Crowdsourced ash sighting. Reports decay (see AreaStatusService) so stale
 * sightings do not keep an area escalated.
 */
@Entity
@Table(name = "ash_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AshReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(length = 280)
    private String note;

    @Column(nullable = false)
    private Instant reportedAt;

    @PrePersist
    void stamp() {
        if (reportedAt == null) reportedAt = Instant.now();
    }
}
