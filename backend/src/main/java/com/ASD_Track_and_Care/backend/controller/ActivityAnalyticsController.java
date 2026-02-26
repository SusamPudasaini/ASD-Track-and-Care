package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.model.ActivityResult;
import com.ASD_Track_and_Care.backend.model.ActivityType;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.ActivityResultRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/analytics")
public class ActivityAnalyticsController {

    private static final Logger log = LoggerFactory.getLogger(ActivityAnalyticsController.class);

    private final ActivityResultRepository repo;
    private final UserRepository userRepo;

    public ActivityAnalyticsController(ActivityResultRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    private User requireUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("UNAUTHORIZED");
        }

        String name = auth.getName(); // username OR email

        Optional<User> byUsername = userRepo.findByUsername(name);
        Optional<User> byEmail = userRepo.findByUserEmail(name);

        return byUsername.or(() -> byEmail)
                .orElseThrow(() -> new RuntimeException("User not found by username/email: " + name));
    }

    // GET /api/analytics/activities?limit=200&type=REACTION_TIME
    @GetMapping("/activities")
    public ResponseEntity<?> analytics(
            Authentication auth,
            @RequestParam(value = "limit", required = false, defaultValue = "200") int limit,
            @RequestParam(value = "type", required = false) String type
    ) {
        try {
            User user = requireUser(auth);

            // ✅ same canonical username used in save
            String canonicalUsername = user.getUsername();

            int safeLimit = Math.max(1, Math.min(limit, 500));
            Pageable pageable = PageRequest.of(0, safeLimit);

            List<ActivityResult> list;

            if (type == null || type.isBlank()) {
                list = repo.findByUsernameOrderByCreatedAtDesc(canonicalUsername, pageable);
            } else {
                ActivityType at;
                try {
                    at = ActivityType.valueOf(type.toUpperCase());
                } catch (Exception e) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "message", "Invalid activity type",
                            "type", type
                    ));
                }
                list = repo.findByUsernameAndTypeOrderByCreatedAtDesc(canonicalUsername, at, pageable);
            }

            log.info("ANALYTICS => authName={}, canonicalUsername={}, type={}, returned={}",
                    auth.getName(), canonicalUsername, (type == null ? "" : type), list.size());

            List<Map<String, Object>> out = new ArrayList<>();
            for (ActivityResult r : list) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", r.getId());
                m.put("type", r.getType().name());
                m.put("score", r.getScore());
                m.put("detailsJson", r.getDetailsJson());
                m.put("createdAt", r.getCreatedAt().toString());
                out.add(m);
            }

            return ResponseEntity.ok(out);

        } catch (RuntimeException ex) {
            if ("UNAUTHORIZED".equals(ex.getMessage())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please login first"));
            }
            log.error("Could not load analytics", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not load analytics",
                    "error", ex.getMessage()
            ));
        } catch (Exception e) {
            log.error("Could not load analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not load analytics",
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        }
    }
}