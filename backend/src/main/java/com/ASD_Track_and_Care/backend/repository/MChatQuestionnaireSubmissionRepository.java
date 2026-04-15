package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireSubmission;
import com.ASD_Track_and_Care.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MChatQuestionnaireSubmissionRepository extends JpaRepository<MChatQuestionnaireSubmission, Long> {
    List<MChatQuestionnaireSubmission> findAllByUserOrderBySubmittedAtDesc(User user);
    Optional<MChatQuestionnaireSubmission> findTopByUserOrderBySubmittedAtDesc(User user);
    void deleteAllByUser_Id(Long userId);
}