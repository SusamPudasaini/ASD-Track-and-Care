package com.ASD_Track_and_Care.backend.dto;

public class MChatCategoryScoreDto {
    private String category;
    private Double developmentScore;
    private Double concernScore;

    public MChatCategoryScoreDto() {}

    public MChatCategoryScoreDto(String category, Double developmentScore, Double concernScore) {
        this.category = category;
        this.developmentScore = developmentScore;
        this.concernScore = concernScore;
    }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getDevelopmentScore() { return developmentScore; }
    public void setDevelopmentScore(Double developmentScore) { this.developmentScore = developmentScore; }

    public Double getConcernScore() { return concernScore; }
    public void setConcernScore(Double concernScore) { this.concernScore = concernScore; }
}