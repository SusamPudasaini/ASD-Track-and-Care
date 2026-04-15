package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireAnswer;
import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MChatQuestionnaireAnswerRepository extends JpaRepository<MChatQuestionnaireAnswer, Long> {
    List<MChatQuestionnaireAnswer> findAllBySubmission(MChatQuestionnaireSubmission submission);

    void deleteAllBySubmission_User_Id(Long userId);
}