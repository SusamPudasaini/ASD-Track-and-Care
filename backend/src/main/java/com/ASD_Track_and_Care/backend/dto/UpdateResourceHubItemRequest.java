package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.ResourceCategory;
import com.ASD_Track_and_Care.backend.model.ResourceContentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UpdateResourceHubItemRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String description;

    @NotNull
    private ResourceContentType contentType;

    @NotNull
    private ResourceCategory category;

    private String thumbnailUrl;
    private String videoUrl;
    private String fileUrl;
    private String externalUrl;
    private String contentBody;

    @NotNull
    private Boolean published;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ResourceContentType getContentType() { return contentType; }
    public void setContentType(ResourceContentType contentType) { this.contentType = contentType; }

    public ResourceCategory getCategory() { return category; }
    public void setCategory(ResourceCategory category) { this.category = category; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getExternalUrl() { return externalUrl; }
    public void setExternalUrl(String externalUrl) { this.externalUrl = externalUrl; }

    public String getContentBody() { return contentBody; }
    public void setContentBody(String contentBody) { this.contentBody = contentBody; }

    public Boolean getPublished() { return published; }
    public void setPublished(Boolean published) { this.published = published; }
}