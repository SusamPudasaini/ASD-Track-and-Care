package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateAacCardRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateAacCardRequest;
import com.ASD_Track_and_Care.backend.service.AacService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/aac-cards")
public class AdminAacController {

    private final AacService aacService;

    public AdminAacController(AacService aacService) {
        this.aacService = aacService;
    }

    @GetMapping
    public ResponseEntity<?> listAll() {
        return ResponseEntity.ok(aacService.listAllCardsForAdmin());
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateAacCardRequest req) {
        return ResponseEntity.ok(aacService.createCard(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody UpdateAacCardRequest req) {
        return ResponseEntity.ok(aacService.updateCard(id, req));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<?> toggleActive(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(aacService.toggleCard(id, active));
    }
}