package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MChatQuestionnaireQuestionRepository extends JpaRepository<MChatQuestionnaireQuestion, Long> {
    List<MChatQuestionnaireQuestion> findAllByActiveTrueOrderByIdAsc();
    List<MChatQuestionnaireQuestion> findAllByOrderByIdAsc();
}