package com.ASD_Track_and_Care.backend.dto;

public class ProfileResponse {
    private String username;
    private String userEmail;

    private String firstName;
    private String lastName;
    private String fullName;

    private String phoneNumber;

    public ProfileResponse() {}

    public ProfileResponse(String username, String userEmail, String firstName, String lastName, String phoneNumber) {
        this.username = username;
        this.userEmail = userEmail;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phoneNumber = phoneNumber;

        String fn = firstName == null ? "" : firstName;
        String ln = lastName == null ? "" : lastName;
        this.fullName = (fn + " " + ln).trim();
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
