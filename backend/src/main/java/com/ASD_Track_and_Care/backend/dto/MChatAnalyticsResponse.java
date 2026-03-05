package com.ASD_Track_and_Care.backend.dto;

import com.ASD_Track_and_Care.backend.model.MChatRiskLevel;

import java.util.ArrayList;
import java.util.List;

public class MChatAnalyticsResponse {
    private int totalSubmissions;
    private Double latestDevelopmentScore;
    private Double latestConcernScore;
    private Double previousDevelopmentScore;
    private Double previousConcernScore;
    private Double improvementDelta;
    private MChatRiskLevel latestRiskLevel;
    private List<MChatTrendPointDto> trends = new ArrayList<>();
    private List<MChatCategoryScoreDto> categories = new ArrayList<>();

    public int getTotalSubmissions() { return totalSubmissions; }
    public void setTotalSubmissions(int totalSubmissions) { this.totalSubmissions = totalSubmissions; }

    public Double getLatestDevelopmentScore() { return latestDevelopmentScore; }
    public void setLatestDevelopmentScore(Double latestDevelopmentScore) {
        this.latestDevelopmentScore = latestDevelopmentScore;
    }

    public Double getLatestConcernScore() { return latestConcernScore; }
    public void setLatestConcernScore(Double latestConcernScore) { this.latestConcernScore = latestConcernScore; }

    public Double getPreviousDevelopmentScore() { return previousDevelopmentScore; }
    public void setPreviousDevelopmentScore(Double previousDevelopmentScore) {
        this.previousDevelopmentScore = previousDevelopmentScore;
    }

    public Double getPreviousConcernScore() { return previousConcernScore; }
    public void setPreviousConcernScore(Double previousConcernScore) { this.previousConcernScore = previousConcernScore; }

    public Double getImprovementDelta() { return improvementDelta; }
    public void setImprovementDelta(Double improvementDelta) { this.improvementDelta = improvementDelta; }

    public MChatRiskLevel getLatestRiskLevel() { return latestRiskLevel; }
    public void setLatestRiskLevel(MChatRiskLevel latestRiskLevel) { this.latestRiskLevel = latestRiskLevel; }

    public List<MChatTrendPointDto> getTrends() { return trends; }
    public void setTrends(List<MChatTrendPointDto> trends) { this.trends = trends; }

    public List<MChatCategoryScoreDto> getCategories() { return categories; }
    public void setCategories(List<MChatCategoryScoreDto> categories) { this.categories = categories; }
}