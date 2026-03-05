package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.ArrayList;
import java.util.List;

public class SubmitMChatQuestionnaireRequest {

    @Valid
    @NotEmpty
    private List<SubmitMChatQuestionAnswerRequest> answers = new ArrayList<>();

    private String notes;

    public List<SubmitMChatQuestionAnswerRequest> getAnswers() { return answers; }
    public void setAnswers(List<SubmitMChatQuestionAnswerRequest> answers) { this.answers = answers; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}