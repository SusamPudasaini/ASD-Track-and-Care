package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateAacFavoritePhraseRequest {

    @NotBlank(message = "phraseText is required")
    private String phraseText;

    public String getPhraseText() { return phraseText; }
    public void setPhraseText(String phraseText) { this.phraseText = phraseText; }
}