package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.TherapistApplyRequest;
import com.ASD_Track_and_Care.backend.dto.TherapistCardResponse;
import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.service.TherapistApplicationService;
import com.ASD_Track_and_Care.backend.service.TherapistService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/therapists")
public class TherapistController {

    private final TherapistApplicationService applicationService;
    private final TherapistService therapistService;

    public TherapistController(
            TherapistApplicationService applicationService,
            TherapistService therapistService
    ) {
        this.applicationService = applicationService;
        this.therapistService = therapistService;
    }

    /**
     * ✅ PUBLIC / PROTECTED (depending on your ProtectedRoute)
     * Therapist grid listing.
     * Fetches from users table where role=THERAPIST.
     *
     * GET /api/therapists
     */
    @GetMapping
    public ResponseEntity<List<TherapistCardResponse>> listTherapists() {
        return ResponseEntity.ok(therapistService.listTherapists());
    }

    /**
     * ✅ Authenticated users apply (multipart: JSON + files)
     * POST /api/therapists/apply
     */
    @PostMapping(
            value = "/apply",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> apply(
            Authentication authentication,
            @Valid @RequestPart("application") TherapistApplyRequest request,
            @RequestParam(value = "documentTitles", required = false) List<String> documentTitles,
            @RequestParam(value = "documentFiles", required = false) List<MultipartFile> documentFiles
    ) {
        String username = authentication.getName();
        TherapistApplication created = applicationService.submit(username, request, documentTitles, documentFiles);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of(
                        "message", "Application submitted successfully",
                        "applicationId", created.getId(),
                        "status", created.getStatus().name()
                )
        );
    }

    /**
     * ✅ User checks latest application status + admin message + docs
     * GET /api/therapists/my-application
     */
    @GetMapping("/my-application")
    public ResponseEntity<?> myApplication(Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(applicationService.getLatestForUser(username));
    }
}
