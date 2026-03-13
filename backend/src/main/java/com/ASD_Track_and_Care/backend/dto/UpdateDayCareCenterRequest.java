package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.DayCareCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UpdateDayCareCenterRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String description;

    @NotNull
    private DayCareCategory category;

    @NotBlank
    private String address;

    private Double latitude;
    private Double longitude;

    private String phone;
    private String email;
    private String websiteUrl;
    private String imageUrl;
    private String googleMapsUrl;
    private String googlePlaceId;

    @NotNull
    private Boolean published;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public DayCareCategory getCategory() { return category; }
    public void setCategory(DayCareCategory category) { this.category = category; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getGoogleMapsUrl() { return googleMapsUrl; }
    public void setGoogleMapsUrl(String googleMapsUrl) { this.googleMapsUrl = googleMapsUrl; }

    public String getGooglePlaceId() { return googlePlaceId; }
    public void setGooglePlaceId(String googlePlaceId) { this.googlePlaceId = googlePlaceId; }

    public Boolean getPublished() { return published; }
    public void setPublished(Boolean published) { this.published = published; }
}