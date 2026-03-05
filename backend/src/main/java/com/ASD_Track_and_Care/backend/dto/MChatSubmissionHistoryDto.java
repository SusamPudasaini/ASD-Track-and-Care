package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.MChatRiskLevel;

import java.time.Instant;

public class MChatSubmissionHistoryDto {
    private Long id;
    private Double developmentScore;
    private Double concernScore;
    private Double normalizedDevelopmentScore;
    private Double normalizedConcernScore;
    private MChatRiskLevel riskLevel;
    private String notes;
    private Instant submittedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Double getDevelopmentScore() { return developmentScore; }
    public void setDevelopmentScore(Double developmentScore) { this.developmentScore = developmentScore; }

    public Double getConcernScore() { return concernScore; }
    public void setConcernScore(Double concernScore) { this.concernScore = concernScore; }

    public Double getNormalizedDevelopmentScore() { return normalizedDevelopmentScore; }
    public void setNormalizedDevelopmentScore(Double normalizedDevelopmentScore) {
        this.normalizedDevelopmentScore = normalizedDevelopmentScore;
    }

    public Double getNormalizedConcernScore() { return normalizedConcernScore; }
    public void setNormalizedConcernScore(Double normalizedConcernScore) {
        this.normalizedConcernScore = normalizedConcernScore;
    }

    public MChatRiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(MChatRiskLevel riskLevel) { this.riskLevel = riskLevel; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
}