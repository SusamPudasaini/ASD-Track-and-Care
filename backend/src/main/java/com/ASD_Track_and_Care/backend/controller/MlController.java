package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.PredictPayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/ml")
public class MlController {

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper mapper;

    private final String fastapiUrl = "http://localhost:8000/predict";
    private final String apiKey = "SusamSecretAndhoMancheleMovieHeryo";

    public MlController(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @PostMapping("/predict")
    public ResponseEntity<?> predict(@Valid @RequestBody PredictPayload payload) {

        // Convert DTO -> Map for FastAPI "features"
        Map<String, Object> features = mapper.convertValue(payload, Map.class);
        Map<String, Object> fastApiBody = Map.of("features", features);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-KEY", apiKey);

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(fastApiBody, headers);

        ResponseEntity<String> resp = rest.postForEntity(fastapiUrl, req, String.class);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }
}
