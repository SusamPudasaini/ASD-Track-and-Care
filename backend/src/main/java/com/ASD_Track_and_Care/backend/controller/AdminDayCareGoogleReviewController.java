package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateDayCareGoogleReviewRequest;
import com.ASD_Track_and_Care.backend.service.DayCareReviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/daycares")
public class AdminDayCareGoogleReviewController {

    private final DayCareReviewService dayCareReviewService;

    public AdminDayCareGoogleReviewController(DayCareReviewService dayCareReviewService) {
        this.dayCareReviewService = dayCareReviewService;
    }

    @PostMapping("/{id}/google-reviews")
    public ResponseEntity<?> addGoogleReviewSnapshot(
            @PathVariable Long id,
            @Valid @RequestBody CreateDayCareGoogleReviewRequest req
    ) {
        return ResponseEntity.ok(dayCareReviewService.addGoogleReviewSnapshot(id, req));
    }
}