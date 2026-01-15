package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.QuestionnaireRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionnaireRecordRepository extends JpaRepository<QuestionnaireRecord, Long> {
    List<QuestionnaireRecord> findByUserId(Long userId);
}
