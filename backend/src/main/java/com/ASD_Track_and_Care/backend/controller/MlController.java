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
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/ml")
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

    @PostMapping("/predict")
    public ResponseEntity<?> predict(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody PredictPayload payload
    ) {

        // -------------------- 0) GET LOGGED IN USER --------------------
        User user;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            log.info("AUTH DEBUG => name={}, principal={}, authenticated={}, AuthorizationPresent={}",
                    auth != null ? auth.getName() : null,
                    auth != null ? auth.getPrincipal() : null,
                    auth != null && auth.isAuthenticated(),
                    authorization != null && !authorization.isBlank()
            );

            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "message", "Please login first"
                ));
            }

            // auth.getName() may be username OR email depending on your JWT setup
            String name = auth.getName();

            Optional<User> byUsername = userRepo.findByUsername(name);
            Optional<User> byEmail = userRepo.findByUserEmail(name);

            user = byUsername.or(() -> byEmail)
                    .orElseThrow(() -> new RuntimeException("User not found by username/email: " + name));

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
            // ✅ FastAPI returns {"asd_probability_score": pred}
            if (node.hasNonNull("asd_probability_score")) {
                probability = node.get("asd_probability_score").asDouble();
            } else if (node.hasNonNull("probability")) {
                probability = node.get("probability").asDouble();
            } else if (node.hasNonNull("autism_probability")) {
                probability = node.get("autism_probability").asDouble();
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
                riskLevel = "Low";          // bottom ~5%
            } else if (probability < 0.060) {
                riskLevel = "Moderate";     // ~5% to ~50%
            } else {
                riskLevel = "High";         // top ~50%
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
