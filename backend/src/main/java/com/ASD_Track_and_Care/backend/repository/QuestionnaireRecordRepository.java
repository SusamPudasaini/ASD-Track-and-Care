package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.QuestionnaireRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;


import java.util.List;
import java.util.Optional;

public interface QuestionnaireRecordRepository extends JpaRepository<QuestionnaireRecord, Long> {
    List<QuestionnaireRecord> findByUserId(Long userId);
    
    // ✅ latest N records (sorted newest first)
    List<QuestionnaireRecord> findByUser_IdOrderByIdDesc(Long userId, Pageable pageable);

    // ✅ latest 1 record
    Optional<QuestionnaireRecord> findTopByUser_IdOrderByIdDesc(Long userId);
}
