package com.ASD_Track_and_Care.backend.dto;

import java.time.Instant;

public class DayCareGoogleReviewResponse {
    private Long id;
    private String authorName;
    private Integer rating;
    private String comment;
    private String relativeTimeText;
    private Instant createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getRelativeTimeText() { return relativeTimeText; }
    public void setRelativeTimeText(String relativeTimeText) { this.relativeTimeText = relativeTimeText; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}