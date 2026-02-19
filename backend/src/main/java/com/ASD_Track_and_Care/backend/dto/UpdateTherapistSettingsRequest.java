package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class UpdateTherapistSettingsRequest {

    @NotNull(message = "pricePerSession is required")
    @DecimalMin(value = "0.01", message = "pricePerSession must be greater than 0")
    private BigDecimal pricePerSession;

    /**
     * availability: { "Sunday": ["09:00","09:30"], "Monday": ["10:00"] }
     */
    @NotNull(message = "availability is required")
    private Map<String, List<String>> availability;

    public BigDecimal getPricePerSession() {
        return pricePerSession;
    }

    public void setPricePerSession(BigDecimal pricePerSession) {
        this.pricePerSession = pricePerSession;
    }

    public Map<String, List<String>> getAvailability() {
        return availability;
    }

    public void setAvailability(Map<String, List<String>> availability) {
        this.availability = availability;
    }
}
