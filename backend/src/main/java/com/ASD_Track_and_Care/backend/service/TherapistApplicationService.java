package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.TherapistApplyRequest;
import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.repository.TherapistApplicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TherapistApplicationService {

    private final TherapistApplicationRepository repo;

    public TherapistApplicationService(TherapistApplicationRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public TherapistApplication submit(String applicantUsername, TherapistApplyRequest req) {

        // Optional: prevent spam re-apply if latest is still pending
        repo.findTopByApplicantUsernameOrderByCreatedAtDesc(applicantUsername).ifPresent(latest -> {
            if (latest.getStatus() == TherapistApplication.Status.PENDING) {
                throw new IllegalStateException("You already have a pending therapist application.");
            }
        });

        TherapistApplication app = new TherapistApplication();
        app.setApplicantUsername(applicantUsername);

        app.setFullName(req.getFullName().trim());
        app.setEmail(req.getEmail().trim());
        app.setPhone(req.getPhone().trim());
        app.setQualification(req.getQualification().trim());

        app.setLicenseNumber(req.getLicenseNumber() == null ? null : req.getLicenseNumber().trim());
        app.setYearsExperience(req.getYearsExperience());
        app.setSpecialization(req.getSpecialization() == null ? null : req.getSpecialization().trim());
        app.setWorkplace(req.getWorkplace() == null ? null : req.getWorkplace().trim());
        app.setCity(req.getCity() == null ? null : req.getCity().trim());
        app.setMessage(req.getMessage() == null ? null : req.getMessage().trim());

        app.setStatus(TherapistApplication.Status.PENDING);

        return repo.save(app);
    }
}
