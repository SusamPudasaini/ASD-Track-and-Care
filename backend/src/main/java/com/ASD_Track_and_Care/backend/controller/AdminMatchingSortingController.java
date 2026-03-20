package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateMatchingSortingActivityRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateMatchingSortingActivityRequest;
import com.ASD_Track_and_Care.backend.service.MatchingSortingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/matching-sorting")
public class AdminMatchingSortingController {

    private final MatchingSortingService matchingSortingService;

    public AdminMatchingSortingController(MatchingSortingService matchingSortingService) {
        this.matchingSortingService = matchingSortingService;
    }

    @GetMapping
    public ResponseEntity<?> listAll() {
        return ResponseEntity.ok(matchingSortingService.listAllForAdmin());
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateMatchingSortingActivityRequest req) {
        return ResponseEntity.ok(matchingSortingService.createActivity(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMatchingSortingActivityRequest req
    ) {
        return ResponseEntity.ok(matchingSortingService.updateActivity(id, req));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<?> toggleActive(
            @PathVariable Long id,
            @RequestParam boolean active
    ) {
        return ResponseEntity.ok(matchingSortingService.toggleActive(id, active));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        matchingSortingService.deleteActivity(id);
        return ResponseEntity.ok("Matching/Sorting activity deleted successfully");
    }
}