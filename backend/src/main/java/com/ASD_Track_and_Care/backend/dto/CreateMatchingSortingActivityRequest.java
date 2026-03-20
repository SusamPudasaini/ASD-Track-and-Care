package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.MatchingSortingType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.List;

public class CreateMatchingSortingActivityRequest {

    @NotBlank(message = "title is required")
    private String title;

    private String description;

    @NotNull(message = "type is required")
    private MatchingSortingType type;

    private Boolean active = true;

    @Valid
    private List<MatchingSortingItemRequest> items = new ArrayList<>();

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public MatchingSortingType getType() { return type; }
    public void setType(MatchingSortingType type) { this.type = type; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public List<MatchingSortingItemRequest> getItems() { return items; }
    public void setItems(List<MatchingSortingItemRequest> items) { this.items = items; }
}