package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateBookingRequest {

    @NotNull(message = "therapistId is required")
    private Long therapistId;

    @NotBlank(message = "date is required") // YYYY-MM-DD
    private String date;

    @NotBlank(message = "time is required") // HH:mm
    private String time;

    // for future Khalti integration
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
