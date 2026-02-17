package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TherapistApplicationRepository extends JpaRepository<TherapistApplication, Long> {

    Optional<TherapistApplication> findTopByApplicantUsernameOrderByCreatedAtDesc(String applicantUsername);

    List<TherapistApplication> findByStatusOrderByCreatedAtDesc(TherapistApplication.Status status);
    List<TherapistApplication> findByEmailOrderByCreatedAtDesc(String email);
    List<TherapistApplication> findByApplicantUsernameOrderByCreatedAtDesc(String applicantUsername);

}
