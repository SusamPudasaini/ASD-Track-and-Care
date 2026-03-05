package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateMChatQuestionRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateMChatQuestionRequest;
import com.ASD_Track_and_Care.backend.service.MChatQuestionnaireAdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/mchat-questions")
public class AdminMChatQuestionnaireController {

    private final MChatQuestionnaireAdminService adminService;

    public AdminMChatQuestionnaireController(MChatQuestionnaireAdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateMChatQuestionRequest req) {
        return ResponseEntity.ok(adminService.create(req));
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(adminService.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody UpdateMChatQuestionRequest req) {
        return ResponseEntity.ok(adminService.update(id, req));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<?> setActive(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(adminService.toggleActive(id, active));
    }
}