package com.ASD_Track_and_Care.backend.dto;

public class MChatTrendPointDto {
    private String date;
    private Double developmentScore;
    private Double concernScore;

    public MChatTrendPointDto() {}

    public MChatTrendPointDto(String date, Double developmentScore, Double concernScore) {
        this.date = date;
        this.developmentScore = developmentScore;
        this.concernScore = concernScore;
    }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public Double getDevelopmentScore() { return developmentScore; }
    public void setDevelopmentScore(Double developmentScore) { this.developmentScore = developmentScore; }

    public Double getConcernScore() { return concernScore; }
    public void setConcernScore(Double concernScore) { this.concernScore = concernScore; }
}