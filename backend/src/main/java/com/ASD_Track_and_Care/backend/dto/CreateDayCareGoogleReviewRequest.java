package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateDayCareGoogleReviewRequest {

    @NotBlank
    private String authorName;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    @NotBlank
    private String comment;

    private String relativeTimeText;

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getRelativeTimeText() { return relativeTimeText; }
    public void setRelativeTimeText(String relativeTimeText) { this.relativeTimeText = relativeTimeText; }
}