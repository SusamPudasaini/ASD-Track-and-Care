package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.config.ElevenLabsProperties;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ElevenLabsTtsService {

    private static final String DEFAULT_MODEL_ID = "eleven_multilingual_v2";

    private final RestTemplate restTemplate;
    private final ElevenLabsProperties properties;

    public ElevenLabsTtsService(RestTemplate restTemplate, ElevenLabsProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    public byte[] generateSpeech(String text) {
        String normalizedText = text == null ? "" : text.trim();
        if (!StringUtils.hasText(normalizedText)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Text is required for speech generation.");
        }

        if (!StringUtils.hasText(properties.getApiKey()) || !StringUtils.hasText(properties.getVoiceId())) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Text-to-speech is not configured. Please set ElevenLabs API key and voice ID."
            );
        }

        String url = "https://api.elevenlabs.io/v1/text-to-speech/" + properties.getVoiceId();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("xi-api-key", properties.getApiKey());
        headers.setAccept(List.of(MediaType.valueOf("audio/mpeg")));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", normalizedText);
        body.put("model_id", StringUtils.hasText(properties.getModelId())
            ? properties.getModelId()
            : DEFAULT_MODEL_ID);

        Map<String, Object> voiceSettings = new LinkedHashMap<>();
        voiceSettings.put("stability", 0.45);
        voiceSettings.put("similarity_boost", 0.75);
        body.put("voice_settings", voiceSettings);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    byte[].class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().length == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ElevenLabs returned an empty audio response.");
            }

            return response.getBody();
        } catch (HttpStatusCodeException ex) {
            String detail = compactExternalMessage(ex.getResponseBodyAsString());
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            String message = upstreamMessageForStatus(status, ex.getStatusCode().value());
            if (StringUtils.hasText(detail)) {
                message = message + ": " + detail;
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, message, ex);
        } catch (ResourceAccessException ex) {
            throw new ResponseStatusException(
                    HttpStatus.GATEWAY_TIMEOUT,
                    "Timed out while contacting ElevenLabs. Please try again.",
                    ex
            );
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to generate audio from ElevenLabs.", ex);
        }
    }

    private String upstreamMessageForStatus(HttpStatus status, int rawStatus) {
        if (Objects.equals(status, HttpStatus.UNAUTHORIZED) || Objects.equals(status, HttpStatus.FORBIDDEN)) {
            return "ElevenLabs authentication failed. Please verify ELEVENLABS_API_KEY.";
        }
        if (Objects.equals(status, HttpStatus.PAYMENT_REQUIRED)) {
            return "ElevenLabs rejected the request due to plan/credit limits.";
        }
        if (Objects.equals(status, HttpStatus.TOO_MANY_REQUESTS)) {
            return "ElevenLabs rate limit reached. Please try again shortly.";
        }
        if (Objects.equals(status, HttpStatus.BAD_REQUEST) || Objects.equals(status, HttpStatus.UNPROCESSABLE_ENTITY)) {
            return "ElevenLabs rejected the text-to-speech payload.";
        }
        if (status != null && status.is5xxServerError()) {
            return "ElevenLabs service is temporarily unavailable.";
        }
        return "ElevenLabs request failed with status " + rawStatus;
    }

    private String compactExternalMessage(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }

        String compact = raw.replace('\n', ' ').replace('\r', ' ').trim();
        if (compact.length() > 240) {
            return compact.substring(0, 240) + "...";
        }
        return compact;
    }
}