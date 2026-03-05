package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.service.MChatQuestionnaireAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics/mchat-questionnaire")
public class MChatQuestionnaireAnalyticsController {

    private final MChatQuestionnaireAnalyticsService analyticsService;

    public MChatQuestionnaireAnalyticsController(MChatQuestionnaireAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping
    public ResponseEntity<?> getMyAnalytics(Authentication authentication) {
        return ResponseEntity.ok(analyticsService.getMyAnalytics(authentication));
    }
}