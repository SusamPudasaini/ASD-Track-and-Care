package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateDayCareCenterRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateDayCareCenterRequest;
import com.ASD_Track_and_Care.backend.service.DayCareCenterService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/daycares")
public class AdminDayCareCenterController {

    private final DayCareCenterService dayCareCenterService;

    public AdminDayCareCenterController(DayCareCenterService dayCareCenterService) {
        this.dayCareCenterService = dayCareCenterService;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateDayCareCenterRequest req) {
        return ResponseEntity.ok(dayCareCenterService.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody UpdateDayCareCenterRequest req) {
        return ResponseEntity.ok(dayCareCenterService.update(id, req));
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(dayCareCenterService.adminList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(dayCareCenterService.getByIdForAdmin(id));
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<?> setPublished(@PathVariable Long id,
                                          @RequestParam boolean published) {
        return ResponseEntity.ok(dayCareCenterService.setPublished(id, published));
    }
}