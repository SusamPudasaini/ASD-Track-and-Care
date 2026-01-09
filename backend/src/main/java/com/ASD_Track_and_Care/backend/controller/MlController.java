package com.ASD_Track_and_Care.backend.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/ml")
public class MlController {

    private final RestTemplate rest = new RestTemplate();

    private final String fastapiUrl = "http://localhost:8000/predict";
    private final String apiKey = "SusamSecretAndhoMancheleMovieHeryo";

    @PostMapping("/predict")
    public ResponseEntity<?> predict(@RequestBody Map<String, Object> body) {

        Object featuresObj = body.get("features");
        if (!(featuresObj instanceof Map)) {
            return ResponseEntity.badRequest().body("Invalid payload: 'features' missing");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-KEY", apiKey); // FastAPI checks this header

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);

        ResponseEntity<String> resp = rest.postForEntity(fastapiUrl, req, String.class);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }
}
