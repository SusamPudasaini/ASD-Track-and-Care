package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateBookingRequest {

    @NotNull(message = "therapistId is required")
    private Long therapistId;

    // "YYYY-MM-DD"
    @NotBlank(message = "date is required")
    private String date;

    // "HH:mm"
    @NotBlank(message = "time is required")
    private String time;

    // optional for now
    private String pidx;

    public Long getTherapistId() { return therapistId; }
    public void setTherapistId(Long therapistId) { this.therapistId = therapistId; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getPidx() { return pidx; }
    public void setPidx(String pidx) { this.pidx = pidx; }
}
