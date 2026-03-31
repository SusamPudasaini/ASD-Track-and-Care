package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.config.ElevenLabsProperties;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ElevenLabsTtsService {

    private final RestTemplate restTemplate;
    private final ElevenLabsProperties properties;

    public ElevenLabsTtsService(RestTemplate restTemplate, ElevenLabsProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    public byte[] generateSpeech(String text) {
        String url = "https://api.elevenlabs.io/v1/text-to-speech/" + properties.getVoiceId();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("xi-api-key", properties.getApiKey());
        headers.setAccept(List.of(MediaType.valueOf("audio/mpeg")));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", text);
        body.put("model_id", properties.getModelId());

        Map<String, Object> voiceSettings = new LinkedHashMap<>();
        voiceSettings.put("stability", 0.45);
        voiceSettings.put("similarity_boost", 0.75);
        body.put("voice_settings", voiceSettings);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<byte[]> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                byte[].class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Failed to generate audio from ElevenLabs.");
        }

        return response.getBody();
    }
}