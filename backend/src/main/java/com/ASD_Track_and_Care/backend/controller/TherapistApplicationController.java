package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.service.TherapistApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/therapist-applications")
public class TherapistApplicationController {

    private final TherapistApplicationService service;

    public TherapistApplicationController(TherapistApplicationService service) {
        this.service = service;
    }

    @GetMapping("/my")
    public ResponseEntity<?> myApplications(Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(service.listMine(username));
    }

    @GetMapping("/my/{id}")
    public ResponseEntity<?> myApplicationDetails(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(service.getMyDetails(id, username));
    }
}
