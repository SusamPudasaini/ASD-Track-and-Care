package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateFirstThenBoardRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateFirstThenBoardRequest;
import com.ASD_Track_and_Care.backend.service.FirstThenBoardService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/first-then")
public class FirstThenBoardController {

    private final FirstThenBoardService firstThenBoardService;

    public FirstThenBoardController(FirstThenBoardService firstThenBoardService) {
        this.firstThenBoardService = firstThenBoardService;
    }

    @GetMapping
    public ResponseEntity<?> listMyBoards(Authentication authentication) {
        return ResponseEntity.ok(firstThenBoardService.listMyBoards(authentication));
    }

    @PostMapping
    public ResponseEntity<?> createBoard(
            Authentication authentication,
            @Valid @RequestBody CreateFirstThenBoardRequest req
    ) {
        return ResponseEntity.ok(firstThenBoardService.createBoard(authentication, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBoard(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody UpdateFirstThenBoardRequest req
    ) {
        return ResponseEntity.ok(firstThenBoardService.updateBoard(id, authentication, req));
    }

    @PutMapping("/{id}/completed")
    public ResponseEntity<?> markCompleted(
            @PathVariable Long id,
            Authentication authentication,
            @RequestParam boolean completed
    ) {
        return ResponseEntity.ok(firstThenBoardService.markCompleted(id, authentication, completed));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<?> toggleActive(
            @PathVariable Long id,
            Authentication authentication,
            @RequestParam boolean active
    ) {
        return ResponseEntity.ok(firstThenBoardService.toggleActive(id, authentication, active));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBoard(
            @PathVariable Long id,
            Authentication authentication
    ) {
        firstThenBoardService.deleteBoard(id, authentication);
        return ResponseEntity.ok("First-Then board deleted successfully");
    }
}