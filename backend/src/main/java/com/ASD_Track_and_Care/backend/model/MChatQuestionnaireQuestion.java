package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "mchat_questionnaire_questions")
public class MChatQuestionnaireQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private MChatQuestionCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MChatQuestionAnswerType answerType;

    @Column(nullable = false)
    private Integer weight = 1;

    @Column(nullable = false)
    private boolean active = true;

    /**
     * false = higher answer means better development
     * true  = higher answer means more concern, so reverse it for development score
     */
    @Column(nullable = false)
    private boolean reverseScored = false;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public MChatQuestionnaireQuestion() {}

    public Long getId() { return id; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public MChatQuestionCategory getCategory() { return category; }
    public void setCategory(MChatQuestionCategory category) { this.category = category; }

    public MChatQuestionAnswerType getAnswerType() { return answerType; }
    public void setAnswerType(MChatQuestionAnswerType answerType) { this.answerType = answerType; }

    public Integer getWeight() { return weight; }
    public void setWeight(Integer weight) { this.weight = weight; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public boolean isReverseScored() { return reverseScored; }
    public void setReverseScored(boolean reverseScored) { this.reverseScored = reverseScored; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}