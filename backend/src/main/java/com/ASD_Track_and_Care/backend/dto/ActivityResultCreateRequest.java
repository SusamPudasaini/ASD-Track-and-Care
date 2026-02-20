package com.ASD_Track_and_Care.backend.dto;

public class ActivityResultCreateRequest {
    public String type;     // e.g. "REACTION_TIME"
    public Double score;    // e.g. 245
    public Object details;  // any JSON-like object from frontend
}