package com.ASD_Track_and_Care.backend.dto;

public class BookingResponse {
    private Long id;
    private String date;
    private String time;
    private String status;

    private Long therapistId;
    private String therapistName;
    private String therapistEmail;
    private String therapistPhone;
    private String therapistProfilePictureUrl;

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
}
