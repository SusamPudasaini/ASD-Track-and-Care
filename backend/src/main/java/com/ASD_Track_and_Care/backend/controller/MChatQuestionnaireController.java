package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.SubmitMChatQuestionnaireRequest;
import com.ASD_Track_and_Care.backend.service.MChatQuestionnaireService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mchat-questionnaire")
public class MChatQuestionnaireController {

    private final MChatQuestionnaireService questionnaireService;

    public MChatQuestionnaireController(MChatQuestionnaireService questionnaireService) {
        this.questionnaireService = questionnaireService;
    }

    @GetMapping("/questions")
    public ResponseEntity<?> getActiveQuestions() {
        return ResponseEntity.ok(questionnaireService.getActiveQuestions());
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submit(Authentication authentication,
                                    @Valid @RequestBody SubmitMChatQuestionnaireRequest req) {
        return ResponseEntity.ok(questionnaireService.submit(authentication, req));
    }

    @GetMapping("/history")
    public ResponseEntity<?> myHistory(Authentication authentication) {
        return ResponseEntity.ok(questionnaireService.myHistory(authentication));
    }
}