package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.AacCardCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateAacCardRequest {

    @NotBlank(message = "label is required")
    private String label;

    private String imageUrl;

    @NotNull(message = "category is required")
    private AacCardCategory category;

    private Integer sortOrder = 0;
    private Boolean active = true;

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public AacCardCategory getCategory() { return category; }
    public void setCategory(AacCardCategory category) { this.category = category; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}