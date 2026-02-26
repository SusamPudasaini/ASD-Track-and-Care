package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.model.ActivityResult;
import com.ASD_Track_and_Care.backend.model.ActivityType;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.ActivityResultRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/activities/results")
public class ActivityResultController {

    private static final Logger log = LoggerFactory.getLogger(ActivityResultController.class);

    private final ActivityResultRepository repo;
    private final UserRepository userRepo;
    private final ObjectMapper mapper;

    public ActivityResultController(ActivityResultRepository repo, UserRepository userRepo, ObjectMapper mapper) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.mapper = mapper;
    }

    // ✅ DTO for create
    public static class ActivityResultCreateRequest {
        @NotBlank
        public String type; // e.g. "REACTION_TIME"

        @NotNull
        public Double score;

        public Map<String, Object> details; // optional metadata
    }

    // ✅ resolve logged-in user (username OR email)
    private User requireUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("UNAUTHORIZED");
        }

        String name = auth.getName(); // might be username OR email

        Optional<User> byUsername = userRepo.findByUsername(name);
        Optional<User> byEmail = userRepo.findByUserEmail(name);

        return byUsername.or(() -> byEmail)
                .orElseThrow(() -> new RuntimeException("User not found by username/email: " + name));
    }

    // ✅ ONLY ONE SAVE ENDPOINT IN THE APP
    // POST /api/activities/results
    @PostMapping
    public ResponseEntity<?> save(@Valid @RequestBody ActivityResultCreateRequest req, Authentication auth) {
        try {
            User user = requireUser(auth);

            // ✅ store canonical username from DB (always consistent)
            String canonicalUsername = user.getUsername();

            ActivityType type;
            try {
                type = ActivityType.valueOf(req.type.toUpperCase());
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Invalid activity type",
                        "type", req.type
                ));
            }

            String detailsJson = null;
            try {
                if (req.details != null) detailsJson = mapper.writeValueAsString(req.details);
            } catch (Exception e) {
                // ignore
            }

            ActivityResult r = new ActivityResult();
            r.setType(type);
            r.setScore(req.score);
            r.setDetailsJson(detailsJson);
            r.setUsername(canonicalUsername);

            r = repo.save(r);

            log.info("ACTIVITY SAVE => authName={}, canonicalUsername={}, type={}, score={}, id={}",
                    auth.getName(), canonicalUsername, type.name(), req.score, r.getId());

            return ResponseEntity.ok(Map.of(
                    "id", r.getId(),
                    "type", r.getType().name(),
                    "score", r.getScore(),
                    "detailsJson", r.getDetailsJson(),
                    "createdAt", r.getCreatedAt().toString(),
                    "username", r.getUsername()
            ));

        } catch (RuntimeException ex) {
            if ("UNAUTHORIZED".equals(ex.getMessage())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please login first"));
            }
            log.error("Could not save activity result", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not save activity result",
                    "error", ex.getMessage()
            ));
        } catch (Exception e) {
            log.error("Could not save activity result", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not save activity result",
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        }
    }
}