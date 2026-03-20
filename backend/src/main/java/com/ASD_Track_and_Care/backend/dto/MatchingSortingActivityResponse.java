package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.MatchingSortingType;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class MatchingSortingActivityResponse {

    private Long id;
    private String title;
    private String description;
    private MatchingSortingType type;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
    private List<MatchingSortingItemResponse> items = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public MatchingSortingType getType() { return type; }
    public void setType(MatchingSortingType type) { this.type = type; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public List<MatchingSortingItemResponse> getItems() { return items; }
    public void setItems(List<MatchingSortingItemResponse> items) { this.items = items; }
}