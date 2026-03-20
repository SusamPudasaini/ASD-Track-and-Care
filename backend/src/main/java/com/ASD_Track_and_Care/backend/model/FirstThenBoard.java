package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "first_then_boards")
public class FirstThenBoard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String firstTitle;

    @Column(length = 1000)
    private String firstImageUrl;

    @Column(nullable = false, length = 150)
    private String thenTitle;

    @Column(length = 1000)
    private String thenImageUrl;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public FirstThenBoard() {}

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }

    public String getFirstTitle() { return firstTitle; }
    public void setFirstTitle(String firstTitle) { this.firstTitle = firstTitle; }

    public String getFirstImageUrl() { return firstImageUrl; }
    public void setFirstImageUrl(String firstImageUrl) { this.firstImageUrl = firstImageUrl; }

    public String getThenTitle() { return thenTitle; }
    public void setThenTitle(String thenTitle) { this.thenTitle = thenTitle; }

    public String getThenImageUrl() { return thenImageUrl; }
    public void setThenImageUrl(String thenImageUrl) { this.thenImageUrl = thenImageUrl; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}