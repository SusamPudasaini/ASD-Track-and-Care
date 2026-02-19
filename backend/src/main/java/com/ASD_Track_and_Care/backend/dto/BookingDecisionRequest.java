package com.ASD_Track_and_Care.backend.dto;

public class BookingDecisionRequest {
    private String message; // optional cancel reason

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
