package com.ASD_Track_and_Care.backend.dto;

import java.math.BigDecimal;

public class TherapistCardResponse {

    private Long id;
    private String name;
    private String qualification;
    private Integer experienceYears;
    private Double averageReview;
    private Integer reviewCount;
    private String address;
    private Double workplaceLatitude;
    private Double workplaceLongitude;
    private BigDecimal pricePerSession;
    private String profilePictureUrl;

    // ✅ NEW
    private long slotCount;
    private boolean available;

    public TherapistCardResponse() {}

    public TherapistCardResponse(
            Long id,
            String name,
            String qualification,
            Integer experienceYears,
            Double averageReview,
            Integer reviewCount,
            String address,
            Double workplaceLatitude,
            Double workplaceLongitude,
            BigDecimal pricePerSession,
            String profilePictureUrl,
            long slotCount,
            boolean available
    ) {
        this.id = id;
        this.name = name;
        this.qualification = qualification;
        this.experienceYears = experienceYears;
        this.averageReview = averageReview;
        this.reviewCount = reviewCount;
        this.address = address;
        this.workplaceLatitude = workplaceLatitude;
        this.workplaceLongitude = workplaceLongitude;
        this.pricePerSession = pricePerSession;
        this.profilePictureUrl = profilePictureUrl;
        this.slotCount = slotCount;
        this.available = available;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }

    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }

    public Double getAverageReview() { return averageReview; }
    public void setAverageReview(Double averageReview) { this.averageReview = averageReview; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getWorkplaceLatitude() { return workplaceLatitude; }
    public void setWorkplaceLatitude(Double workplaceLatitude) { this.workplaceLatitude = workplaceLatitude; }

    public Double getWorkplaceLongitude() { return workplaceLongitude; }
    public void setWorkplaceLongitude(Double workplaceLongitude) { this.workplaceLongitude = workplaceLongitude; }

    public BigDecimal getPricePerSession() { return pricePerSession; }
    public void setPricePerSession(BigDecimal pricePerSession) { this.pricePerSession = pricePerSession; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public long getSlotCount() { return slotCount; }
    public void setSlotCount(long slotCount) { this.slotCount = slotCount; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
