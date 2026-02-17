package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.TherapistApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TherapistApplicationDocumentRepository extends JpaRepository<TherapistApplicationDocument, Long> {
    List<TherapistApplicationDocument> findByApplicationIdOrderByUploadedAtAsc(Long applicationId);
}
