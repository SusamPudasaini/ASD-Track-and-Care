package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.MChatQuestionAnswerType;
import com.ASD_Track_and_Care.backend.model.MChatQuestionCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateMChatQuestionRequest {

    @NotBlank
    private String questionText;

    @NotNull
    private MChatQuestionCategory category;

    @NotNull
    private MChatQuestionAnswerType answerType;

    @NotNull
    @Min(1)
    private Integer weight;

    @NotNull
    private Boolean reverseScored;

    @NotNull
    private Boolean active;

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public MChatQuestionCategory getCategory() { return category; }
    public void setCategory(MChatQuestionCategory category) { this.category = category; }

    public MChatQuestionAnswerType getAnswerType() { return answerType; }
    public void setAnswerType(MChatQuestionAnswerType answerType) { this.answerType = answerType; }

    public Integer getWeight() { return weight; }
    public void setWeight(Integer weight) { this.weight = weight; }

    public Boolean getReverseScored() { return reverseScored; }
    public void setReverseScored(Boolean reverseScored) { this.reverseScored = reverseScored; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}