package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.service.ResourceHubService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/resources")
public class ResourceHubController {

    private final ResourceHubService resourceHubService;

    public ResourceHubController(ResourceHubService resourceHubService) {
        this.resourceHubService = resourceHubService;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(value = "category", required = false) String category) {
        return ResponseEntity.ok(resourceHubService.userList(category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(resourceHubService.getByIdForUser(id));
    }
}