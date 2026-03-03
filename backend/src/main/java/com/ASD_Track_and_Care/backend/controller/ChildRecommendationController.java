package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.ChildRecommendationResponse;
import com.ASD_Track_and_Care.backend.service.ChildRecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
public class ChildRecommendationController {

    private final ChildRecommendationService childRecommendationService;

    public ChildRecommendationController(ChildRecommendationService childRecommendationService) {
        this.childRecommendationService = childRecommendationService;
    }

    @GetMapping("/child-plan")
    public ResponseEntity<ChildRecommendationResponse> myChildPlan(Authentication authentication) {
        return ResponseEntity.ok(childRecommendationService.getMyRecommendations(authentication));
    }
}
