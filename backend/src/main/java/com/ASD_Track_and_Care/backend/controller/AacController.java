package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.CreateAacFavoritePhraseRequest;
import com.ASD_Track_and_Care.backend.model.AacCardCategory;
import com.ASD_Track_and_Care.backend.service.AacService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/aac")
public class AacController {

    private final AacService aacService;

    public AacController(AacService aacService) {
        this.aacService = aacService;
    }

    @GetMapping("/cards")
    public ResponseEntity<?> listCards(
            @RequestParam(required = false) AacCardCategory category
    ) {
        return ResponseEntity.ok(aacService.listActiveCards(category));
    }

    @GetMapping("/favorite-phrases")
    public ResponseEntity<?> myFavoritePhrases(Authentication authentication) {
        return ResponseEntity.ok(aacService.listMyFavoritePhrases(authentication));
    }

    @PostMapping("/favorite-phrases")
    public ResponseEntity<?> saveFavoritePhrase(
            Authentication authentication,
            @Valid @RequestBody CreateAacFavoritePhraseRequest req
    ) {
        return ResponseEntity.ok(aacService.saveFavoritePhrase(authentication, req));
    }
}