package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateDayCareUserReviewRequest;
import com.ASD_Track_and_Care.backend.service.DayCareReviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/daycares")
public class DayCareReviewController {

    private final DayCareReviewService dayCareReviewService;

    public DayCareReviewController(DayCareReviewService dayCareReviewService) {
        this.dayCareReviewService = dayCareReviewService;
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<?> listUserReviews(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(dayCareReviewService.listUserReviews(id, authentication));
    }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<?> createOrUpdateReview(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody CreateDayCareUserReviewRequest req
    ) {
        return ResponseEntity.ok(dayCareReviewService.createOrUpdateUserReview(id, authentication, req));
    }

    @GetMapping("/{id}/google-reviews")
    public ResponseEntity<?> listGoogleReviews(@PathVariable Long id) {
        return ResponseEntity.ok(dayCareReviewService.listGoogleReviews(id));
    }
}