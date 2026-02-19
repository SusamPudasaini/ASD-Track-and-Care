package com.ASD_Track_and_Care.backend.dto;

public class BookingResponse {
    private Long id;
    private String date;
    private String time;
    private String status;

    // therapist details
    private Long therapistId;
    private String therapistName;
    private String therapistEmail;
    private String therapistPhone;
    private String therapistProfilePictureUrl;

    // user/patient details (booker)
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String userProfilePictureUrl;

    // ✅ NEW: therapist message (cancel reason / note)
    private String therapistMessage;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

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

    // ✅ NEW getter/setter
    public String getTherapistMessage() { return therapistMessage; }
    public void setTherapistMessage(String therapistMessage) { this.therapistMessage = therapistMessage; }
}
