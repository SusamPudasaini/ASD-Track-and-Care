package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateFirstThenBoardRequest {

    @NotBlank(message = "firstTitle is required")
    private String firstTitle;

    private String firstImageUrl;

    @NotBlank(message = "thenTitle is required")
    private String thenTitle;

    private String thenImageUrl;

    private Boolean active = true;
    private Boolean completed = false;

    public String getFirstTitle() { return firstTitle; }
    public void setFirstTitle(String firstTitle) { this.firstTitle = firstTitle; }

    public String getFirstImageUrl() { return firstImageUrl; }
    public void setFirstImageUrl(String firstImageUrl) { this.firstImageUrl = firstImageUrl; }

    public String getThenTitle() { return thenTitle; }
    public void setThenTitle(String thenTitle) { this.thenTitle = thenTitle; }

    public String getThenImageUrl() { return thenImageUrl; }
    public void setThenImageUrl(String thenImageUrl) { this.thenImageUrl = thenImageUrl; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Boolean getCompleted() { return completed; }
    public void setCompleted(Boolean completed) { this.completed = completed; }
}