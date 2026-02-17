package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.TherapistDecisionRequest;
import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.service.TherapistApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

    // ✅ GET by status (PENDING/APPROVED/REJECTED)
    @GetMapping
    public ResponseEntity<List<TherapistApplication>> list(@RequestParam("status") String status) {
        TherapistApplication.Status st = TherapistApplication.Status.valueOf(status.toUpperCase());
        return ResponseEntity.ok(service.listByStatus(st));
    }

    // Backward compatible endpoint
    @GetMapping("/pending")
    public ResponseEntity<List<TherapistApplication>> getPending() {
        return ResponseEntity.ok(service.listByStatus(TherapistApplication.Status.PENDING));
    }

    // ✅ NEW: details endpoint for admin panel (application + docs + download URLs)
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDetails(@PathVariable Long id) {
        return ResponseEntity.ok(service.getAdminDetails(id));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id,
                                    @RequestBody(required = false) TherapistDecisionRequest body,
                                    Authentication auth) {
        String adminUsername = auth.getName();
        String msg = body == null ? null : body.getAdminMessage();

        TherapistApplication updated = service.approveApplication(id, adminUsername, msg);

        return ResponseEntity.ok(Map.of(
                "message", "Application approved",
                "applicationId", updated.getId(),
                "status", updated.getStatus().name()
        ));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id,
                                   @RequestBody(required = false) TherapistDecisionRequest body,
                                   Authentication auth) {
        String adminUsername = auth.getName();
        String msg = body == null ? null : body.getAdminMessage();

        TherapistApplication updated = service.rejectApplication(id, adminUsername, msg);

        return ResponseEntity.ok(Map.of(
                "message", "Application rejected",
                "applicationId", updated.getId(),
                "status", updated.getStatus().name()
        ));
    }

    // ✅ NEW: mark as pending (revert approved/rejected)
    @PutMapping("/{id}/mark-pending")
    public ResponseEntity<?> markPending(@PathVariable Long id,
                                         @RequestBody(required = false) TherapistDecisionRequest body,
                                         Authentication auth) {
        String adminUsername = auth.getName();
        String msg = body == null ? null : body.getAdminMessage();

        TherapistApplication updated = service.markPending(id, adminUsername, msg);

        return ResponseEntity.ok(Map.of(
                "message", "Application marked as pending",
                "applicationId", updated.getId(),
                "status", updated.getStatus().name()
        ));
    }
}
