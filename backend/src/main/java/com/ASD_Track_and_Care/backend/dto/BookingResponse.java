package com.ASD_Track_and_Care.backend.dto;

import java.util.List;

public class BookingResponse {
    private Long id;
    private String date;
    private String time;
    private String status;

    private String paymentStatus;
    private String khaltiPidx;
    private String paymentUrl;

    // therapist details
    private Long therapistId;
    private String therapistName;
    private String therapistEmail;
    private String therapistPhone;
    private String therapistProfilePictureUrl;

    // user/patient details
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String userProfilePictureUrl;

    private String therapistMessage;
    private boolean reviewSubmitted;
    private Integer reviewRating;

    // child assessment snapshot for therapist decision-making
    private Double aiProbabilityScore;
    private Double mchatScore;
    private String riskLevel;
    private String aiRiskLevel;
    private String mchatRiskLevel;
    private List<String> weaknessCategories;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getKhaltiPidx() { return khaltiPidx; }
    public void setKhaltiPidx(String khaltiPidx) { this.khaltiPidx = khaltiPidx; }

    public String getPaymentUrl() { return paymentUrl; }
    public void setPaymentUrl(String paymentUrl) { this.paymentUrl = paymentUrl; }

    public Long getTherapistId() { return therapistId; }
    public void setTherapistId(Long therapistId) { this.therapistId = therapistId; }

    public String getTherapistName() { return therapistName; }
    public void setTherapistName(String therapistName) { this.therapistName = therapistName; }

    public String getTherapistEmail() { return therapistEmail; }
    public void setTherapistEmail(String therapistEmail) { this.therapistEmail = therapistEmail; }

    public String getTherapistPhone() { return therapistPhone; }
    public void setTherapistPhone(String therapistPhone) { this.therapistPhone = therapistPhone; }

    public String getTherapistProfilePictureUrl() { return therapistProfilePictureUrl; }
    public void setTherapistProfilePictureUrl(String therapistProfilePictureUrl) { this.therapistProfilePictureUrl = therapistProfilePictureUrl; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getUserPhone() { return userPhone; }
    public void setUserPhone(String userPhone) { this.userPhone = userPhone; }

    public String getUserProfilePictureUrl() { return userProfilePictureUrl; }
    public void setUserProfilePictureUrl(String userProfilePictureUrl) { this.userProfilePictureUrl = userProfilePictureUrl; }

    public String getTherapistMessage() { return therapistMessage; }
    public void setTherapistMessage(String therapistMessage) { this.therapistMessage = therapistMessage; }

    public boolean isReviewSubmitted() { return reviewSubmitted; }
    public void setReviewSubmitted(boolean reviewSubmitted) { this.reviewSubmitted = reviewSubmitted; }

    public Integer getReviewRating() { return reviewRating; }
    public void setReviewRating(Integer reviewRating) { this.reviewRating = reviewRating; }

    public Double getAiProbabilityScore() { return aiProbabilityScore; }
    public void setAiProbabilityScore(Double aiProbabilityScore) { this.aiProbabilityScore = aiProbabilityScore; }

    public Double getMchatScore() { return mchatScore; }
    public void setMchatScore(Double mchatScore) { this.mchatScore = mchatScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getAiRiskLevel() { return aiRiskLevel; }
    public void setAiRiskLevel(String aiRiskLevel) { this.aiRiskLevel = aiRiskLevel; }

    public String getMchatRiskLevel() { return mchatRiskLevel; }
    public void setMchatRiskLevel(String mchatRiskLevel) { this.mchatRiskLevel = mchatRiskLevel; }

    public List<String> getWeaknessCategories() { return weaknessCategories; }
    public void setWeaknessCategories(List<String> weaknessCategories) { this.weaknessCategories = weaknessCategories; }
}