package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateFirstThenBoardRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateFirstThenBoardRequest;
import com.ASD_Track_and_Care.backend.service.FirstThenBoardService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

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

    @GetMapping("/{id}")
    public ResponseEntity<?> getBoardById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(firstThenBoardService.getBoardById(id, authentication));
    }

    @PostMapping
    public ResponseEntity<?> createBoard(
            Authentication authentication,
            @Valid @RequestBody CreateFirstThenBoardRequest req
    ) {
        return ResponseEntity.ok(firstThenBoardService.createBoard(authentication, req));
    }

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadImage(
            Authentication authentication,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false, defaultValue = "task") String slot
    ) {
        String imageUrl = firstThenBoardService.uploadBoardImage(authentication, file, slot);
        return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
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