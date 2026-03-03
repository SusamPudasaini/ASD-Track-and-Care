package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.AvailabilityDay;
import com.ASD_Track_and_Care.backend.model.Role;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class ProfileResponse {

    private String username;
    private String userEmail;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String address;
    private Double latitude;
    private Double longitude;
    private String workplaceAddress;
    private Double workplaceLatitude;
    private Double workplaceLongitude;

    private Role role;
    private String profilePictureUrl;

    // therapist-only (null for normal users)
    private BigDecimal pricePerSession;
    private String qualification;
    private Integer experienceYears;
    private Double averageReview;
    private Integer reviewCount;

    // ✅ keep if you still want it
    // but now availability is the real one
    // (you can remove availableDays later if not needed)
    // private java.util.Set<AvailabilityDay> availableDays;

    private Map<AvailabilityDay, List<String>> availability;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getWorkplaceAddress() { return workplaceAddress; }
    public void setWorkplaceAddress(String workplaceAddress) { this.workplaceAddress = workplaceAddress; }

    public Double getWorkplaceLatitude() { return workplaceLatitude; }
    public void setWorkplaceLatitude(Double workplaceLatitude) { this.workplaceLatitude = workplaceLatitude; }

    public Double getWorkplaceLongitude() { return workplaceLongitude; }
    public void setWorkplaceLongitude(Double workplaceLongitude) { this.workplaceLongitude = workplaceLongitude; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public BigDecimal getPricePerSession() { return pricePerSession; }
    public void setPricePerSession(BigDecimal pricePerSession) { this.pricePerSession = pricePerSession; }

    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }

    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }

    public Double getAverageReview() { return averageReview; }
    public void setAverageReview(Double averageReview) { this.averageReview = averageReview; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public Map<AvailabilityDay, List<String>> getAvailability() { return availability; }
    public void setAvailability(Map<AvailabilityDay, List<String>> availability) { this.availability = availability; }
}
