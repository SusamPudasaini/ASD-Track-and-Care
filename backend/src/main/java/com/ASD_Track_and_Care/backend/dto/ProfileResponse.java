package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.AvailabilityDay;
import com.ASD_Track_and_Care.backend.model.Role;

import java.math.BigDecimal;
import java.util.Set;

public class ProfileResponse {

    private String username;
    private String userEmail;
    private String firstName;
    private String lastName;
    private String phoneNumber;

    private Role role;

    private String profilePictureUrl;

    // Therapist-only (can be null for non-therapists)
    private BigDecimal pricePerSession;
    private Set<AvailabilityDay> availableDays;

    public ProfileResponse() {}

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

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public BigDecimal getPricePerSession() { return pricePerSession; }
    public void setPricePerSession(BigDecimal pricePerSession) { this.pricePerSession = pricePerSession; }

    public Set<AvailabilityDay> getAvailableDays() { return availableDays; }
    public void setAvailableDays(Set<AvailabilityDay> availableDays) { this.availableDays = availableDays; }
}
