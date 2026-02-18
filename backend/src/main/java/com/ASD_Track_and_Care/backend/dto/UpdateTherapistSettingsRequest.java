package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.AvailabilityDay;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.Set;

public class UpdateTherapistSettingsRequest {

    @NotNull(message = "pricePerSession is required")
    @Positive(message = "pricePerSession must be > 0")
    private BigDecimal pricePerSession;

    @NotNull(message = "availableDays is required")
    private Set<AvailabilityDay> availableDays;

    public UpdateTherapistSettingsRequest() {}

    public BigDecimal getPricePerSession() { return pricePerSession; }
    public void setPricePerSession(BigDecimal pricePerSession) { this.pricePerSession = pricePerSession; }

    public Set<AvailabilityDay> getAvailableDays() { return availableDays; }
    public void setAvailableDays(Set<AvailabilityDay> availableDays) { this.availableDays = availableDays; }
}
