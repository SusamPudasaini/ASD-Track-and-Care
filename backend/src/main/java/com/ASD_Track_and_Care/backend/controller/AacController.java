package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.AacSpeakRequest;
import com.ASD_Track_and_Care.backend.dto.CreateAacFavoritePhraseRequest;
import com.ASD_Track_and_Care.backend.model.AacCardCategory;
import com.ASD_Track_and_Care.backend.service.AacService;
import com.ASD_Track_and_Care.backend.service.ElevenLabsTtsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/aac")
public class AacController {

    private final AacService aacService;
    private final ElevenLabsTtsService elevenLabsTtsService;

    public AacController(AacService aacService, ElevenLabsTtsService elevenLabsTtsService) {
        this.aacService = aacService;
        this.elevenLabsTtsService = elevenLabsTtsService;
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

    @PostMapping("/speak")
    public ResponseEntity<byte[]> speak(
            Authentication authentication,
            @Valid @RequestBody AacSpeakRequest req
    ) {
        byte[] audio = elevenLabsTtsService.generateSpeech(req.getText());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=aac-nepali.mp3")
                .contentType(MediaType.valueOf("audio/mpeg"))
                .body(audio);
    }
}