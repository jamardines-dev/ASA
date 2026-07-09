package com.ashalert.controller;

import com.ashalert.dto.*;
import com.ashalert.model.Area;
import com.ashalert.model.AshReport;
import com.ashalert.service.AreaStatusService;
import com.ashalert.service.AreaUpdateBroadcaster;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api")
public class AreaController {

    private final AreaStatusService service;
    private final AreaUpdateBroadcaster broadcaster;

    public AreaController(AreaStatusService service, AreaUpdateBroadcaster broadcaster) {
        this.service = service;
        this.broadcaster = broadcaster;
    }

    /** One payload for the whole map: every area with its effective status. */
    @GetMapping("/areas/status")
    public List<AreaStatusDto> allStatuses() {
        return service.getAllStatuses();
    }

    /** Live push of the full area list whenever a status changes. */
    @GetMapping(value = "/areas/stream", produces = "text/event-stream")
    public SseEmitter stream() {
        return broadcaster.subscribe();
    }

    /** "Am I safe here?" — resolves coordinates to the nearest tracked area. */
    @GetMapping("/safety-check")
    public SafetyCheckDto safetyCheck(@RequestParam double lat, @RequestParam double lng) {
        return service.checkLocation(lat, lng);
    }

    /** Recent crowdsourced ash sightings (last 3 hours). */
    @GetMapping("/reports")
    public List<AshReport> recentReports() {
        return service.getRecentReports();
    }

    /** Crowdsourced ash sighting. */
    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public AshReport submitReport(@Valid @RequestBody ReportRequest request) {
        return service.submitReport(request.latitude(), request.longitude(), request.note());
    }

    /**
     * Admin: set an area's base status from an official advisory.
     * In production, protect this with Spring Security (role ADMIN).
     */
    @PutMapping("/admin/areas/{id}/status")
    public Area updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        return service.updateStatus(id, request.status(), request.source());
    }
}
