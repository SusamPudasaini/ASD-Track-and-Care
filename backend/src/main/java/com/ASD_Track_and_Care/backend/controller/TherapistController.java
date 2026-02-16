package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.TherapistApplyRequest;
import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.service.TherapistApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/therapists")
public class TherapistController {

    private final TherapistApplicationService service;

    public TherapistController(TherapistApplicationService service) {
        this.service = service;
    }

    // Authenticated users apply
    @PostMapping("/apply")
    public ResponseEntity<?> apply(Authentication authentication, @Valid @RequestBody TherapistApplyRequest request) {
        String username = authentication.getName(); // comes from JWT subject/userDetails
        TherapistApplication created = service.submit(username, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of(
                        "message", "Application submitted successfully",
                        "applicationId", created.getId(),
                        "status", created.getStatus().name()
                )
        );
    }

    // Optional: user checks latest application status
    @GetMapping("/my-application")
    public ResponseEntity<?> myApplication(Authentication authentication) {
        // You can implement later if needed
        return ResponseEntity.ok(Map.of("message", "Not implemented yet"));
    }
}
