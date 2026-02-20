package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.ActivityResultCreateRequest;
import com.ASD_Track_and_Care.backend.dto.ActivityResultResponse;
import com.ASD_Track_and_Care.backend.service.ActivityResultService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities/results")
public class ActivityResultController {

    private final ActivityResultService service;

    public ActivityResultController(ActivityResultService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ActivityResultResponse> save(
            @RequestBody ActivityResultCreateRequest req,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "anonymous";
        return ResponseEntity.ok(service.save(username, req));
    }

    @GetMapping("/me")
    public ResponseEntity<List<ActivityResultResponse>> myHistory(
            @RequestParam("type") String type,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "anonymous";
        return ResponseEntity.ok(service.history(username, type, limit));
    }
}