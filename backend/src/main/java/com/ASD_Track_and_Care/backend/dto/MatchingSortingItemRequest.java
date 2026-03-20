package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class MatchingSortingItemRequest {

    @NotBlank(message = "item label is required")
    private String label;

    private String imageUrl;

    private String categoryKey;

    private String matchKey;

    private Integer sortOrder = 0;

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getCategoryKey() { return categoryKey; }
    public void setCategoryKey(String categoryKey) { this.categoryKey = categoryKey; }

    public String getMatchKey() { return matchKey; }
    public void setMatchKey(String matchKey) { this.matchKey = matchKey; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}