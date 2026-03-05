package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mchat_questionnaire_answers")
public class MChatQuestionnaireAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private MChatQuestionnaireSubmission submission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private MChatQuestionnaireQuestion question;

    /**
     * raw answer stored as string:
     * YES / NO / NEVER / RARELY / SOMETIMES / OFTEN / ALWAYS
     */
    @Column(nullable = false, length = 30)
    private String answerValue;

    @Column(nullable = false)
    private Integer rawScore = 0;

    @Column(nullable = false)
    private Integer weightedDevelopmentScore = 0;

    @Column(nullable = false)
    private Integer weightedConcernScore = 0;

    public MChatQuestionnaireAnswer() {}

    public Long getId() { return id; }

    public MChatQuestionnaireSubmission getSubmission() { return submission; }
    public void setSubmission(MChatQuestionnaireSubmission submission) { this.submission = submission; }

    public MChatQuestionnaireQuestion getQuestion() { return question; }
    public void setQuestion(MChatQuestionnaireQuestion question) { this.question = question; }

    public String getAnswerValue() { return answerValue; }
    public void setAnswerValue(String answerValue) { this.answerValue = answerValue; }

    public Integer getRawScore() { return rawScore; }
    public void setRawScore(Integer rawScore) { this.rawScore = rawScore; }

    public Integer getWeightedDevelopmentScore() { return weightedDevelopmentScore; }
    public void setWeightedDevelopmentScore(Integer weightedDevelopmentScore) {
        this.weightedDevelopmentScore = weightedDevelopmentScore;
    }

    public Integer getWeightedConcernScore() { return weightedConcernScore; }
    public void setWeightedConcernScore(Integer weightedConcernScore) {
        this.weightedConcernScore = weightedConcernScore;
    }
}