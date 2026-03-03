package com.ASD_Track_and_Care.backend.dto;

import java.util.List;
import java.util.Map;

public class ChildRecommendationResponse {

    private Map<String, Object> riskSummary;
    private List<Map<String, Object>> recommendedActivities;
    private List<Map<String, Object>> recommendedTherapists;
    private List<Map<String, Object>> recommendedDayCareCenters;
    private List<Map<String, Object>> recommendedResources;

    public Map<String, Object> getRiskSummary() {
        return riskSummary;
    }

    public void setRiskSummary(Map<String, Object> riskSummary) {
        this.riskSummary = riskSummary;
    }

    public List<Map<String, Object>> getRecommendedActivities() {
        return recommendedActivities;
    }

    public void setRecommendedActivities(List<Map<String, Object>> recommendedActivities) {
        this.recommendedActivities = recommendedActivities;
    }

    public List<Map<String, Object>> getRecommendedTherapists() {
        return recommendedTherapists;
    }

    public void setRecommendedTherapists(List<Map<String, Object>> recommendedTherapists) {
        this.recommendedTherapists = recommendedTherapists;
    }

    public List<Map<String, Object>> getRecommendedDayCareCenters() {
        return recommendedDayCareCenters;
    }

    public void setRecommendedDayCareCenters(List<Map<String, Object>> recommendedDayCareCenters) {
        this.recommendedDayCareCenters = recommendedDayCareCenters;
    }

    public List<Map<String, Object>> getRecommendedResources() {
        return recommendedResources;
    }

    public void setRecommendedResources(List<Map<String, Object>> recommendedResources) {
        this.recommendedResources = recommendedResources;
    }
}
