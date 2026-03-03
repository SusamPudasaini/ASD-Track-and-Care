package com.ASD_Track_and_Care.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Optional;

@Service
public class AddressGeocodingService {

    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AddressGeocodingService(ObjectMapper objectMapper) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    public Optional<Coordinates> geocode(String address) {
        if (address == null || address.trim().isEmpty()) {
            return Optional.empty();
        }

        String url = UriComponentsBuilder
            .fromUriString(NOMINATIM_URL)
                .queryParam("q", address.trim())
                .queryParam("format", "json")
                .queryParam("limit", 1)
                .queryParam("addressdetails", 0)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("User-Agent", "ASD-Track-and-Care/1.0 (contact: support@asdtrackcare.local)");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );

            String body = response.getBody();
            if (body == null || body.isBlank()) {
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray() || root.isEmpty()) {
                return Optional.empty();
            }

            JsonNode first = root.get(0);
            double lat = first.path("lat").asDouble(Double.NaN);
            double lon = first.path("lon").asDouble(Double.NaN);
            if (Double.isNaN(lat) || Double.isNaN(lon)) {
                return Optional.empty();
            }

            return Optional.of(new Coordinates(lat, lon));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    public record Coordinates(double latitude, double longitude) {}
}
