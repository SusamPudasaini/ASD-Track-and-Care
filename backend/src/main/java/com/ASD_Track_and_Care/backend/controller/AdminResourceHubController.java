package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateResourceHubItemRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateResourceHubItemRequest;
import com.ASD_Track_and_Care.backend.service.ResourceHubService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/resources")
public class AdminResourceHubController {

    private final ResourceHubService resourceHubService;

    public AdminResourceHubController(ResourceHubService resourceHubService) {
        this.resourceHubService = resourceHubService;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateResourceHubItemRequest req) {
        return ResponseEntity.ok(resourceHubService.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody UpdateResourceHubItemRequest req) {
        return ResponseEntity.ok(resourceHubService.update(id, req));
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(resourceHubService.adminList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(resourceHubService.getByIdForAdmin(id));
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<?> setPublished(@PathVariable Long id,
                                          @RequestParam boolean published) {
        return ResponseEntity.ok(resourceHubService.setPublished(id, published));
    }
}