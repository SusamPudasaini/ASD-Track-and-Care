package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "day_care_google_reviews")
public class DayCareGoogleReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "day_care_id", nullable = false)
    private DayCareCenter dayCareCenter;

    @Column(nullable = false, length = 300)
    private String authorName;

    @Column(nullable = false)
    private Integer rating;

    @Column(nullable = false, length = 3000)
    private String comment;

    @Column(length = 500)
    private String relativeTimeText;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }

    public DayCareCenter getDayCareCenter() { return dayCareCenter; }
    public void setDayCareCenter(DayCareCenter dayCareCenter) { this.dayCareCenter = dayCareCenter; }

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