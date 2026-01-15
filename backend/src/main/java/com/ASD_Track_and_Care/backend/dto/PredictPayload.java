package com.ASD_Track_and_Care.backend.dto;

import jakarta.validation.constraints.*;

public class PredictPayload {

    @NotNull @Min(0) @Max(240)
    private Integer age_months;

    @NotNull @Min(0) @Max(1)
    private Integer sex;

    @NotNull @Min(0) @Max(1)
    private Integer residence;

    @NotNull @Min(0) @Max(3)
    private Integer parental_education;

    @NotNull @Min(0) @Max(1)
    private Integer family_history_asd;

    @NotNull @Min(0) @Max(1)
    private Integer preeclampsia;

    @NotNull @Min(0) @Max(1)
    private Integer preterm_birth;

    @NotNull @Min(0) @Max(1)
    private Integer birth_asphyxia;

    @NotNull @Min(0) @Max(1)
    private Integer low_birth_weight;

    @NotNull @Min(0) @Max(240)
    private Integer eye_contact_age_months;

    @NotNull @Min(0) @Max(240)
    private Integer social_smile_months;

    @NotNull @Min(0) @Max(1)
    private Integer intellectual_disability;

    @NotNull @Min(0) @Max(1)
    private Integer epilepsy;

    @NotNull @Min(0) @Max(1)
    private Integer adhd;

    @NotNull @Min(0) @Max(1)
    private Integer language_disorder;

    @NotNull @Min(0) @Max(1)
    private Integer motor_delay;

    @NotNull @Min(0) @Max(1)
    private Integer screening_done;

    @Min(0) @Max(2)
    private Integer screening_result;

    @AssertTrue(message = "screening_result must be provided when screening_done=1 and must be null when screening_done=0")
    public boolean isScreeningConsistent() {
        if (screening_done == null) return true;
        if (screening_done == 1) return screening_result != null;
        return screening_result == null;
    }

    // Getters/Setters
    public Integer getAge_months() { return age_months; }
    public void setAge_months(Integer age_months) { this.age_months = age_months; }

    public Integer getSex() { return sex; }
    public void setSex(Integer sex) { this.sex = sex; }

    public Integer getResidence() { return residence; }
    public void setResidence(Integer residence) { this.residence = residence; }

    public Integer getParental_education() { return parental_education; }
    public void setParental_education(Integer parental_education) { this.parental_education = parental_education; }

    public Integer getFamily_history_asd() { return family_history_asd; }
    public void setFamily_history_asd(Integer family_history_asd) { this.family_history_asd = family_history_asd; }

    public Integer getPreeclampsia() { return preeclampsia; }
    public void setPreeclampsia(Integer preeclampsia) { this.preeclampsia = preeclampsia; }

    public Integer getPreterm_birth() { return preterm_birth; }
    public void setPreterm_birth(Integer preterm_birth) { this.preterm_birth = preterm_birth; }

    public Integer getBirth_asphyxia() { return birth_asphyxia; }
    public void setBirth_asphyxia(Integer birth_asphyxia) { this.birth_asphyxia = birth_asphyxia; }

    public Integer getLow_birth_weight() { return low_birth_weight; }
    public void setLow_birth_weight(Integer low_birth_weight) { this.low_birth_weight = low_birth_weight; }

    public Integer getEye_contact_age_months() { return eye_contact_age_months; }
    public void setEye_contact_age_months(Integer eye_contact_age_months) { this.eye_contact_age_months = eye_contact_age_months; }

    public Integer getSocial_smile_months() { return social_smile_months; }
    public void setSocial_smile_months(Integer social_smile_months) { this.social_smile_months = social_smile_months; }

    public Integer getIntellectual_disability() { return intellectual_disability; }
    public void setIntellectual_disability(Integer intellectual_disability) { this.intellectual_disability = intellectual_disability; }

    public Integer getEpilepsy() { return epilepsy; }
    public void setEpilepsy(Integer epilepsy) { this.epilepsy = epilepsy; }

    public Integer getAdhd() { return adhd; }
    public void setAdhd(Integer adhd) { this.adhd = adhd; }

    public Integer getLanguage_disorder() { return language_disorder; }
    public void setLanguage_disorder(Integer language_disorder) { this.language_disorder = language_disorder; }

    public Integer getMotor_delay() { return motor_delay; }
    public void setMotor_delay(Integer motor_delay) { this.motor_delay = motor_delay; }

    public Integer getScreening_done() { return screening_done; }
    public void setScreening_done(Integer screening_done) { this.screening_done = screening_done; }

    public Integer getScreening_result() { return screening_result; }
    public void setScreening_result(Integer screening_result) { this.screening_result = screening_result; }
}
