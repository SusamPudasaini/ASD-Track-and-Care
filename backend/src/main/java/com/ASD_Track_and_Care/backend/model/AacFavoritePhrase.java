package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "aac_favorite_phrases")
public class AacFavoritePhrase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 500)
    private String phraseText;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getPhraseText() { return phraseText; }
    public void setPhraseText(String phraseText) { this.phraseText = phraseText; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}