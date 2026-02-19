package com.ASD_Track_and_Care.backend.dto;

import java.math.BigDecimal;

public class TherapistCardResponse {

    private Long id;
    private String name;
    private String qualification;
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
            BigDecimal pricePerSession,
            String profilePictureUrl,
            long slotCount,
            boolean available
    ) {
        this.id = id;
        this.name = name;
        this.qualification = qualification;
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

    public BigDecimal getPricePerSession() { return pricePerSession; }
    public void setPricePerSession(BigDecimal pricePerSession) { this.pricePerSession = pricePerSession; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public long getSlotCount() { return slotCount; }
    public void setSlotCount(long slotCount) { this.slotCount = slotCount; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
