package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.model.MatchingSortingType;
import com.ASD_Track_and_Care.backend.service.MatchingSortingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matching-sorting")
public class MatchingSortingController {

    private final MatchingSortingService matchingSortingService;

    public MatchingSortingController(MatchingSortingService matchingSortingService) {
        this.matchingSortingService = matchingSortingService;
    }

    @GetMapping
    public ResponseEntity<?> listActive(
            @RequestParam(required = false) MatchingSortingType type
    ) {
        return ResponseEntity.ok(matchingSortingService.listActiveForUsers(type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(matchingSortingService.getActiveActivityForUser(id));
    }
}