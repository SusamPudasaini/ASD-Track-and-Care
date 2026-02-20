package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "activity_results")
public class ActivityResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType type;

    // score meaning depends on type (reaction time => avg ms)
    @Column(nullable = false)
    private Double score;

    // store JSON as text (simple + flexible)
    @Lob
    @Column(columnDefinition = "TEXT")
    private String detailsJson;

    // store who did it (from token principal name)
    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public ActivityResult() {}

    public ActivityResult(ActivityType type, Double score, String detailsJson, String username) {
        this.type = type;
        this.score = score;
        this.detailsJson = detailsJson;
        this.username = username;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public ActivityType getType() { return type; }
    public void setType(ActivityType type) { this.type = type; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}