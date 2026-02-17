package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.service.TherapistApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/therapist-applications")
public class AdminTherapistApplicationController {

    private final TherapistApplicationService service;

    public AdminTherapistApplicationController(TherapistApplicationService service) {
        this.service = service;
    }

    // GET all pending applications
    @GetMapping("/pending")
    public ResponseEntity<List<TherapistApplication>> getPending() {
        return ResponseEntity.ok(service.getPendingApplications());
    }	

    // Approve
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        TherapistApplication updated = service.approveApplication(id);
        return ResponseEntity.ok(Map.of(
                "message", "Application approved",
                "applicationId", updated.getId(),
                "status", updated.getStatus().name()
        ));
    }

    // Reject
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        TherapistApplication updated = service.rejectApplication(id);
        return ResponseEntity.ok(Map.of(
                "message", "Application rejected",
                "applicationId", updated.getId(),
                "status", updated.getStatus().name()
        ));
    }
}
