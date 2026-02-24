package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.PredictPayload;
import com.ASD_Track_and_Care.backend.model.QuestionnaireRecord;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.QuestionnaireRecordRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ml")
public class MlController {

    private static final Logger log = LoggerFactory.getLogger(MlController.class);

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper mapper;
    private final QuestionnaireRecordRepository repo;
    private final UserRepository userRepo;

    private final String fastapiUrl = "http://localhost:8000/predict";
    private final String apiKey = "SusamSecretAndhoMancheleMovieHeryo";

    public MlController(ObjectMapper mapper,
                        QuestionnaireRecordRepository repo,
                        UserRepository userRepo) {
        this.mapper = mapper;
        this.repo = repo;
        this.userRepo = userRepo;
    }

    // -------------------- ✅ shared: resolve logged-in user --------------------
    private User requireLoggedInUser(String authorizationHeader) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        log.info("AUTH DEBUG => name={}, principal={}, authenticated={}, AuthorizationPresent={}",
                auth != null ? auth.getName() : null,
                auth != null ? auth.getPrincipal() : null,
                auth != null && auth.isAuthenticated(),
                authorizationHeader != null && !authorizationHeader.isBlank()
        );

        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("UNAUTHORIZED");
        }

        String name = auth.getName();

        Optional<User> byUsername = userRepo.findByUsername(name);
        Optional<User> byEmail = userRepo.findByUserEmail(name);

        return byUsername.or(() -> byEmail)
                .orElseThrow(() -> new RuntimeException("User not found by username/email: " + name));
    }

    // -------------------- ✅ NEW: GET latest screening record --------------------
    @GetMapping("/last")
    public ResponseEntity<?> last(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            User user = requireLoggedInUser(authorization);

            Optional<QuestionnaireRecord> recOpt = repo.findTopByUser_IdOrderByIdDesc(user.getId());
            if (recOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "hasHistory", false
                ));
            }

            QuestionnaireRecord r = recOpt.get();
            return ResponseEntity.ok(Map.of(
                    "hasHistory", true,
                    "id", r.getId(),
                    "probability", r.getProbability(),
                    "riskLevel", r.getRiskLevel()
                    // add createdAt if you have it in entity
            ));
        } catch (RuntimeException ex) {
            if ("UNAUTHORIZED".equals(ex.getMessage())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please login first"));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not load last result",
                    "error", ex.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not load last result",
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        }
    }

    // -------------------- ✅ NEW: GET history --------------------
    @GetMapping("/history")
    public ResponseEntity<?> history(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "limit", required = false, defaultValue = "10") int limit
    ) {
        try {
            User user = requireLoggedInUser(authorization);

            int safeLimit = Math.max(1, Math.min(limit, 50));
            Pageable pageable = PageRequest.of(0, safeLimit);

            List<QuestionnaireRecord> list = repo.findByUser_IdOrderByIdDesc(user.getId(), pageable);

            // ⚠️ Only return safe fields (avoid sending all inputs)
            List<Map<String, Object>> out = list.stream().map(r -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", r.getId());
                m.put("probability", r.getProbability());
                m.put("riskLevel", r.getRiskLevel());
                // if you have timestamps, add:
                // m.put("createdAt", r.getCreatedAt());
                return m;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(out);

        } catch (RuntimeException ex) {
            if ("UNAUTHORIZED".equals(ex.getMessage())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please login first"));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not load history",
                    "error", ex.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not load history",
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        }
    }

    // -------------------- EXISTING: POST /predict --------------------
    @PostMapping("/predict")
    public ResponseEntity<?> predict(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody PredictPayload payload
    ) {

        // -------------------- 0) GET LOGGED IN USER --------------------
        User user;
        try {
            user = requireLoggedInUser(authorization);
        } catch (RuntimeException ex) {
            if ("UNAUTHORIZED".equals(ex.getMessage())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please login first"));
            }
            log.error("Failed to resolve logged-in user", ex);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "message", "Authentication error",
                    "error", ex.getMessage()
            ));
        } catch (Exception e) {
            log.error("Failed to resolve logged-in user", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "message", "Authentication error",
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        }

        QuestionnaireRecord record = new QuestionnaireRecord();

        // -------------------- 1) SAVE INPUTS --------------------
        try {
            record.setUser(user);

            record.setAge_months(payload.getAge_months());
            record.setSex(payload.getSex());
            record.setResidence(payload.getResidence());
            record.setParental_education(payload.getParental_education());

            record.setFamily_history_asd(payload.getFamily_history_asd());

            record.setPreeclampsia(payload.getPreeclampsia());
            record.setPreterm_birth(payload.getPreterm_birth());
            record.setBirth_asphyxia(payload.getBirth_asphyxia());
            record.setLow_birth_weight(payload.getLow_birth_weight());

            record.setEye_contact_age_months(payload.getEye_contact_age_months());
            record.setSocial_smile_months(payload.getSocial_smile_months());

            record.setIntellectual_disability(payload.getIntellectual_disability());
            record.setEpilepsy(payload.getEpilepsy());
            record.setAdhd(payload.getAdhd());
            record.setLanguage_disorder(payload.getLanguage_disorder());
            record.setMotor_delay(payload.getMotor_delay());

            record.setScreening_done(payload.getScreening_done());
            record.setScreening_result(payload.getScreening_result());

            record = repo.save(record);

        } catch (Exception e) {
            log.error("DB save failed (before FastAPI call). Payload={}", safeToJson(payload), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Database save failed",
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        }

        // -------------------- 2) CALL FASTAPI --------------------
        ResponseEntity<String> resp;
        try {
            Map<String, Object> features = mapper.convertValue(payload, Map.class);
            Map<String, Object> fastApiBody = Map.of("features", features);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-API-KEY", apiKey);

            HttpEntity<Map<String, Object>> req = new HttpEntity<>(fastApiBody, headers);

            resp = rest.postForEntity(fastapiUrl, req, String.class);

        } catch (RestClientException e) {
            log.error("FastAPI request failed. recordId={}, url={}", record.getId(), fastapiUrl, e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "message", "FastAPI is not reachable (request failed)",
                    "recordId", record.getId(),
                    "fastapiUrl", fastapiUrl,
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Unexpected error calling FastAPI. recordId={}, url={}", record.getId(), fastapiUrl, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Unexpected error while calling FastAPI",
                    "recordId", record.getId(),
                    "fastapiUrl", fastapiUrl,
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        }

        // -------------------- 3) HANDLE FASTAPI NON-2XX --------------------
        if (!resp.getStatusCode().is2xxSuccessful()) {
            log.warn("FastAPI returned non-2xx. recordId={}, status={}, body={}",
                    record.getId(), resp.getStatusCode(), resp.getBody());

            return ResponseEntity.status(resp.getStatusCode()).body(Map.of(
                    "message", "Prediction failed (FastAPI non-2xx)",
                    "recordId", record.getId(),
                    "fastapiStatus", resp.getStatusCode().value(),
                    "fastapiBody", resp.getBody()
            ));
        }

        // -------------------- 4) PARSE RESPONSE + SAVE PREDICTION --------------------
        try {
            String body = resp.getBody();

            if (body == null || body.isBlank()) {
                log.warn("FastAPI returned empty body. recordId={}", record.getId());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "message", "FastAPI returned empty body",
                        "recordId", record.getId()
                ));
            }

            JsonNode node = mapper.readTree(body);

            Double probability = null;
            if (node.hasNonNull("asd_probability_score")) {
                probability = node.get("asd_probability_score").asDouble();
            } else if (node.hasNonNull("probability")) {
                probability = node.get("probability").asDouble();
            } else if (node.hasNonNull("autism_probability")) {
                probability = node.get("autism_probability").asDouble();
            } else if (node.hasNonNull("asd_probability_score")) {
                probability = node.get("asd_probability_score").asDouble();
            }

            if (probability == null) {
                log.warn("FastAPI response missing probability fields. recordId={}, body={}", record.getId(), body);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "message", "FastAPI response missing probability",
                        "recordId", record.getId(),
                        "rawFastApiResponse", body
                ));
            }

            // ✅ dataset-based thresholds
            String riskLevel;
            if (probability < 0.012) {
                riskLevel = "Low";
            } else if (probability < 0.060) {
                riskLevel = "Moderate";
            } else {
                riskLevel = "High";
            }

            record.setProbability(probability);
            record.setRiskLevel(riskLevel);
            repo.save(record);

            return ResponseEntity.ok(Map.of(
                    "recordId", record.getId(),
                    "userId", user.getId(),
                    "probability", probability,
                    "riskLevel", riskLevel
            ));

        } catch (Exception e) {
            log.error("Failed to parse FastAPI response. recordId={}, body={}", record.getId(), resp.getBody(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Could not parse FastAPI response",
                    "recordId", record.getId(),
                    "rawFastApiResponse", resp.getBody(),
                    "error", e.getClass().getSimpleName() + ": " + e.getMessage()
            ));
        }
    }

    private String safeToJson(Object o) {
        try {
            return mapper.writeValueAsString(o);
        } catch (Exception e) {
            return String.valueOf(o);
        }
    }
}