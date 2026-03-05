package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.MChatQuestionAnswerType;
import com.ASD_Track_and_Care.backend.model.MChatQuestionCategory;

public class MChatQuestionResponseDto {
    private Long id;
    private String questionText;
    private MChatQuestionCategory category;
    private MChatQuestionAnswerType answerType;
    private Integer weight;
    private boolean active;
    private boolean reverseScored;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
}