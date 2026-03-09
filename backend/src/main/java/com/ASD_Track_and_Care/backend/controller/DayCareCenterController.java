package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.service.DayCareCenterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/daycares")
public class DayCareCenterController {

    private final DayCareCenterService dayCareCenterService;

    public DayCareCenterController(DayCareCenterService dayCareCenterService) {
        this.dayCareCenterService = dayCareCenterService;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(value = "category", required = false) String category) {
        return ResponseEntity.ok(dayCareCenterService.userList(category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(dayCareCenterService.getByIdForUser(id));
    }
}