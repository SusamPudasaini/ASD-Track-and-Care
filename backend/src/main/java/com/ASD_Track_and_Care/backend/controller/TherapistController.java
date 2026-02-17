package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.TherapistApplyRequest;
import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.service.TherapistApplicationService;
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

    private final TherapistApplicationService service;

    public TherapistController(TherapistApplicationService service) {
        this.service = service;
    }

    // ✅ Authenticated users apply (multipart: JSON + files)
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
        TherapistApplication created = service.submit(username, request, documentTitles, documentFiles);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of(
                        "message", "Application submitted successfully",
                        "applicationId", created.getId(),
                        "status", created.getStatus().name()
                )
        );
    }

    // ✅ User checks latest application status + admin message + docs
    @GetMapping("/my-application")
    public ResponseEntity<?> myApplication(Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(service.getLatestForUser(username));
    }
}
