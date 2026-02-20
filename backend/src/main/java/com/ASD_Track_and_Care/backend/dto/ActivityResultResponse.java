package com.ASD_Track_and_Care.backend.dto;

import java.time.Instant;

public class ActivityResultResponse {
    public Long id;
    public String type;
    public Double score;
    public String detailsJson;
    public Instant createdAt;

    public ActivityResultResponse(Long id, String type, Double score, String detailsJson, Instant createdAt) {
        this.id = id;
        this.type = type;
        this.score = score;
        this.detailsJson = detailsJson;
        this.createdAt = createdAt;
    }
}