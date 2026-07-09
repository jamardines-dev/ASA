package com.ashalert.service;

import com.ashalert.dto.AreaStatusDto;
import com.ashalert.dto.SafetyCheckDto;
import com.ashalert.model.Area;
import com.ashalert.model.AshReport;
import com.ashalert.model.SafetyStatus;
import com.ashalert.repository.AreaRepository;
import com.ashalert.repository.AshReportRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class AreaStatusService {

    /** Crowd reports older than this no longer influence area status. */
    private static final Duration REPORT_WINDOW = Duration.ofHours(3);

    /** How many recent reports near an area escalate it one level. */
    private static final int ESCALATION_THRESHOLD = 3;

    /** A report counts toward an area if it is within this radius. */
    private static final double REPORT_RADIUS_KM = 8.0;

    private final AreaRepository areaRepository;
    private final AshReportRepository reportRepository;
    private final AreaUpdateBroadcaster broadcaster;

    public AreaStatusService(AreaRepository areaRepository, AshReportRepository reportRepository,
                              AreaUpdateBroadcaster broadcaster) {
        this.areaRepository = areaRepository;
        this.reportRepository = reportRepository;
        this.broadcaster = broadcaster;
    }

    /**
     * Everything the map needs in one payload. Cached because every user
     * loading the map hits this; the cache is evicted whenever an admin
     * updates a status or a new report comes in.
     */
    @Cacheable("areaStatuses")
    public List<AreaStatusDto> getAllStatuses() {
        Instant since = Instant.now().minus(REPORT_WINDOW);
        List<AshReport> recentReports = reportRepository.findByReportedAtAfter(since);

        return areaRepository.findAll().stream()
                .map(area -> {
                    long nearby = recentReports.stream()
                            .filter(r -> haversineKm(area.getLatitude(), area.getLongitude(),
                                    r.getLatitude(), r.getLongitude()) <= REPORT_RADIUS_KM)
                            .count();
                    SafetyStatus effective = effectiveStatus(area.getStatus(), nearby);
                    return new AreaStatusDto(
                            area.getId(),
                            area.getName(),
                            area.getLatitude(),
                            area.getLongitude(),
                            effective,
                            maskGuidance(effective),
                            area.getSource(),
                            area.getUpdatedAt(),
                            nearby
                    );
                })
                .toList();
    }

    /** Resolve the caller's coordinates to the nearest tracked area. */
    public SafetyCheckDto checkLocation(double lat, double lng) {
        AreaStatusDto nearest = getAllStatuses().stream()
                .min(Comparator.comparingDouble(a ->
                        haversineKm(lat, lng, a.latitude(), a.longitude())))
                .orElseThrow(() -> new IllegalStateException("No areas configured"));

        double distance = haversineKm(lat, lng, nearest.latitude(), nearest.longitude());
        return new SafetyCheckDto(
                nearest.name(),
                Math.round(distance * 10.0) / 10.0,
                nearest.status(),
                nearest.maskGuidance(),
                advice(nearest.status())
        );
    }

    @CacheEvict(value = "areaStatuses", allEntries = true)
    public Area updateStatus(Long areaId, SafetyStatus status, String source) {
        Area area = areaRepository.findById(areaId)
                .orElseThrow(() -> new IllegalArgumentException("Area not found: " + areaId));
        area.setStatus(status);
        area.setSource(source != null ? source : "Manual update");
        Area saved = areaRepository.save(area);
        broadcaster.broadcast(getAllStatuses());
        return saved;
    }

    @CacheEvict(value = "areaStatuses", allEntries = true)
    public AshReport submitReport(double lat, double lng, String note) {
        checkReportSpam(lat, lng);
        AshReport saved = reportRepository.save(AshReport.builder()
                .latitude(lat)
                .longitude(lng)
                .note(note)
                .build());
        broadcaster.broadcast(getAllStatuses());
        return saved;
    }

    private void checkReportSpam(double lat, double lng) {
        Instant thirtyMinutesAgo = Instant.now().minusSeconds(30 * 60);
        List<AshReport> recentReports = reportRepository.findByReportedAtAfter(thirtyMinutesAgo);

        for (AshReport report : recentReports) {
            double distanceKm = haversineDistance(lat, lng, report.getLatitude(), report.getLongitude());
            if (distanceKm < 0.5) {
                throw new IllegalArgumentException("Report already submitted in this area within the last 30 minutes. Wait before submitting again.");
            }
        }
    }

    private double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /** Crowd reports can escalate SAFE -> CAUTION or CAUTION -> UNSAFE, never de-escalate. */
    private SafetyStatus effectiveStatus(SafetyStatus base, long recentReports) {
        if (recentReports < ESCALATION_THRESHOLD) return base;
        return switch (base) {
            case SAFE -> SafetyStatus.CAUTION;
            case CAUTION, UNSAFE -> SafetyStatus.UNSAFE;
        };
    }

    private String maskGuidance(SafetyStatus status) {
        return switch (status) {
            case SAFE -> "Not required";
            case CAUTION -> "Recommended when outdoors";
            case UNSAFE -> "N95 or KN95 required outdoors";
        };
    }

    private List<String> advice(SafetyStatus status) {
        return switch (status) {
            case SAFE -> List.of("No ashfall reported nearby. Monitor official advisories.");
            case CAUTION -> List.of(
                    "Wear a face mask if you need to go outside",
                    "Keep windows and doors closed",
                    "Monitor PHIVOLCS and LGU advisories"
            );
            case UNSAFE -> List.of(
                    "Stay indoors as much as possible",
                    "Wear an N95 or KN95 mask outdoors",
                    "Keep windows and doors closed",
                    "Cover water sources and food",
                    "Drive slowly with headlights on — ash reduces visibility"
            );
        };
    }

    /** Recent reports from the last 3 hours, sorted newest first. */
    public List<AshReport> getRecentReports() {
        Instant since = Instant.now().minus(REPORT_WINDOW);
        return reportRepository.findByReportedAtAfter(since).stream()
                .sorted(Comparator.comparing(AshReport::getReportedAt).reversed())
                .toList();
    }

    /** Great-circle distance between two coordinates in kilometers. */
    static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
