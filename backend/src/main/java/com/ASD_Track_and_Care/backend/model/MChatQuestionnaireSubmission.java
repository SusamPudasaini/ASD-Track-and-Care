package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "mchat_questionnaire_submissions")
public class MChatQuestionnaireSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // one user = one parent = one child
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Double developmentScore = 0.0;

    @Column(nullable = false)
    private Double concernScore = 0.0;

    @Column(nullable = false)
    private Double normalizedDevelopmentScore = 0.0; // 0-100

    @Column(nullable = false)
    private Double normalizedConcernScore = 0.0; // 0-100

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MChatRiskLevel riskLevel = MChatRiskLevel.LOW;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private Instant submittedAt = Instant.now();

    public MChatQuestionnaireSubmission() {}

    public Long getId() { return id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

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