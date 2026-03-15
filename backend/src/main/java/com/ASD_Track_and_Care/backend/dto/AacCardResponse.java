package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.AacCardCategory;

public class AacCardResponse {
    private Long id;
    private String label;
    private String imageUrl;
    private AacCardCategory category;
    private boolean active;
    private Integer sortOrder;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public AacCardCategory getCategory() { return category; }
    public void setCategory(AacCardCategory category) { this.category = category; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}