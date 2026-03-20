package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "matching_sorting_items")
public class MatchingSortingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id", nullable = false)
    private MatchingSortingActivity activity;

    @Column(nullable = false, length = 150)
    private String label;

    @Column(length = 1000)
    private String imageUrl;

    @Column(length = 100)
    private String categoryKey;

    @Column(length = 100)
    private String matchKey;

    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public MatchingSortingItem() {}

    public Long getId() { return id; }

    public MatchingSortingActivity getActivity() { return activity; }
    public void setActivity(MatchingSortingActivity activity) { this.activity = activity; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getCategoryKey() { return categoryKey; }
    public void setCategoryKey(String categoryKey) { this.categoryKey = categoryKey; }

    public String getMatchKey() { return matchKey; }
    public void setMatchKey(String matchKey) { this.matchKey = matchKey; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}