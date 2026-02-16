package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TherapistApplyRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 120, message = "Full name too long")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email")
    @Size(max = 120, message = "Email too long")
    private String email;

    @NotBlank(message = "Phone is required")
    @Size(max = 40, message = "Phone too long")
    private String phone;

    @NotBlank(message = "Qualification is required")
    @Size(max = 200, message = "Qualification too long")
    private String qualification;

    @Size(max = 80, message = "License number too long")
    private String licenseNumber;

    private Integer yearsExperience;

    @Size(max = 150, message = "Specialization too long")
    private String specialization;

    @Size(max = 150, message = "Workplace too long")
    private String workplace;

    @Size(max = 80, message = "City too long")
    private String city;

    @Size(max = 1000, message = "Message too long")
    private String message;

    public TherapistApplyRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public Integer getYearsExperience() { return yearsExperience; }
    public void setYearsExperience(Integer yearsExperience) { this.yearsExperience = yearsExperience; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public String getWorkplace() { return workplace; }
    public void setWorkplace(String workplace) { this.workplace = workplace; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
