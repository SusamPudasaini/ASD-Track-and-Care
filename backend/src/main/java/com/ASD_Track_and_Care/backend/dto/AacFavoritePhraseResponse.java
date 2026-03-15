package com.ASD_Track_and_Care.backend.dto;

import java.time.Instant;

public class AacFavoritePhraseResponse {
    private Long id;
    private String phraseText;
    private Instant createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPhraseText() { return phraseText; }
    public void setPhraseText(String phraseText) { this.phraseText = phraseText; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}