package com.ASD_Track_and_Care.backend.dto;

import java.time.Instant;

public class FirstThenBoardResponse {

    private Long id;
    private String firstTitle;
    private String firstImageUrl;
    private String thenTitle;
    private String thenImageUrl;
    private boolean completed;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFirstTitle() { return firstTitle; }
    public void setFirstTitle(String firstTitle) { this.firstTitle = firstTitle; }

    public String getFirstImageUrl() { return firstImageUrl; }
    public void setFirstImageUrl(String firstImageUrl) { this.firstImageUrl = firstImageUrl; }

    public String getThenTitle() { return thenTitle; }
    public void setThenTitle(String thenTitle) { this.thenTitle = thenTitle; }

    public String getThenImageUrl() { return thenImageUrl; }
    public void setThenImageUrl(String thenImageUrl) { this.thenImageUrl = thenImageUrl; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}