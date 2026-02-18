package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class RescheduleBookingRequest {

    @NotBlank(message = "date is required")
    private String date;

    @NotBlank(message = "time is required")
    private String time;

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
}
