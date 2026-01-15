package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "questionnaire_records")
public class QuestionnaireRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant createdAt = Instant.now();

    // Inputs (same names conceptually as PredictPayload)
    private Integer age_months;
    private Integer sex;
    private Integer residence;
    private Integer parental_education;

    private Integer family_history_asd;

    private Integer preeclampsia;
    private Integer preterm_birth;
    private Integer birth_asphyxia;
    private Integer low_birth_weight;

    private Integer eye_contact_age_months;
    private Integer social_smile_months;

    private Integer intellectual_disability;
    private Integer epilepsy;
    private Integer adhd;
    private Integer language_disorder;
    private Integer motor_delay;

    private Integer screening_done;

    @Column(nullable = true)
    private Integer screening_result;

    // Prediction
    @Column(nullable = true)
    private Double probability;

    @Column(nullable = true)
    private String riskLevel;

    public Long getId() {
        return id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getAge_months() {
        return age_months;
    }

    public void setAge_months(Integer age_months) {
        this.age_months = age_months;
    }

    public Integer getSex() {
        return sex;
    }

    public void setSex(Integer sex) {
        this.sex = sex;
    }

    public Integer getResidence() {
        return residence;
    }

    public void setResidence(Integer residence) {
        this.residence = residence;
    }

    public Integer getParental_education() {
        return parental_education;
    }

    public void setParental_education(Integer parental_education) {
        this.parental_education = parental_education;
    }

    public Integer getFamily_history_asd() {
        return family_history_asd;
    }

    public void setFamily_history_asd(Integer family_history_asd) {
        this.family_history_asd = family_history_asd;
    }

    public Integer getPreeclampsia() {
        return preeclampsia;
    }

    public void setPreeclampsia(Integer preeclampsia) {
        this.preeclampsia = preeclampsia;
    }

    public Integer getPreterm_birth() {
        return preterm_birth;
    }

    public void setPreterm_birth(Integer preterm_birth) {
        this.preterm_birth = preterm_birth;
    }

    public Integer getBirth_asphyxia() {
        return birth_asphyxia;
    }

    public void setBirth_asphyxia(Integer birth_asphyxia) {
        this.birth_asphyxia = birth_asphyxia;
    }

    public Integer getLow_birth_weight() {
        return low_birth_weight;
    }

    public void setLow_birth_weight(Integer low_birth_weight) {
        this.low_birth_weight = low_birth_weight;
    }

    public Integer getEye_contact_age_months() {
        return eye_contact_age_months;
    }

    public void setEye_contact_age_months(Integer eye_contact_age_months) {
        this.eye_contact_age_months = eye_contact_age_months;
    }

    public Integer getSocial_smile_months() {
        return social_smile_months;
    }

    public void setSocial_smile_months(Integer social_smile_months) {
        this.social_smile_months = social_smile_months;
    }

    public Integer getIntellectual_disability() {
        return intellectual_disability;
    }

    public void setIntellectual_disability(Integer intellectual_disability) {
        this.intellectual_disability = intellectual_disability;
    }

    public Integer getEpilepsy() {
        return epilepsy;
    }

    public void setEpilepsy(Integer epilepsy) {
        this.epilepsy = epilepsy;
    }

    public Integer getAdhd() {
        return adhd;
    }

    public void setAdhd(Integer adhd) {
        this.adhd = adhd;
    }

    public Integer getLanguage_disorder() {
        return language_disorder;
    }

    public void setLanguage_disorder(Integer language_disorder) {
        this.language_disorder = language_disorder;
    }

    public Integer getMotor_delay() {
        return motor_delay;
    }

    public void setMotor_delay(Integer motor_delay) {
        this.motor_delay = motor_delay;
    }

    public Integer getScreening_done() {
        return screening_done;
    }

    public void setScreening_done(Integer screening_done) {
        this.screening_done = screening_done;
    }

    public Integer getScreening_result() {
        return screening_result;
    }

    public void setScreening_result(Integer screening_result) {
        this.screening_result = screening_result;
    }

    public Double getProbability() {
        return probability;
    }

    public void setProbability(Double probability) {
        this.probability = probability;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }
}
