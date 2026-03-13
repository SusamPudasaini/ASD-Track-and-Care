package com.ASD_Track_and_Care.backend.dto;

import java.time.Instant;

public class DayCareUserReviewResponse {
    private Long id;
    private Long userId;
    private String username;
    private Integer rating;
    private String comment;
    private Instant createdAt;
    private Instant updatedAt;
    private boolean mine;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public boolean isMine() { return mine; }
    public void setMine(boolean mine) { this.mine = mine; }
}