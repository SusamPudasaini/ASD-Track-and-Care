package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.TherapistApplyRequest;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.TherapistApplicationRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TherapistApplicationService {

    private final TherapistApplicationRepository repo;
    private final UserRepository userRepository;

    public TherapistApplicationService(TherapistApplicationRepository repo, UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    @Transactional
    public TherapistApplication submit(String applicantUsername, TherapistApplyRequest req) {

        // prevent spam re-apply if latest is still pending
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

    // ✅ Admin: list pending applications
    public List<TherapistApplication> getPendingApplications() {
        return repo.findByStatusOrderByCreatedAtDesc(TherapistApplication.Status.PENDING);
    }

    // ✅ Admin: approve application + promote user role
    @Transactional
    public TherapistApplication approveApplication(Long applicationId) {
        TherapistApplication app = repo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (app.getStatus() != TherapistApplication.Status.PENDING) {
            throw new IllegalStateException("Only PENDING applications can be approved.");
        }

        // find user from applicantUsername (JWT subject)
        User user = userRepository.findByUsername(app.getApplicantUsername())
                .orElseThrow(() -> new RuntimeException("User not found for applicant: " + app.getApplicantUsername()));

        // promote role
        user.setRole(Role.THERAPIST);
        userRepository.save(user);

        // update application status
        app.setStatus(TherapistApplication.Status.APPROVED);
        return repo.save(app);
    }

    // ✅ Admin: reject application
    @Transactional
    public TherapistApplication rejectApplication(Long applicationId) {
        TherapistApplication app = repo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (app.getStatus() != TherapistApplication.Status.PENDING) {
            throw new IllegalStateException("Only PENDING applications can be rejected.");
        }

        app.setStatus(TherapistApplication.Status.REJECTED);
        return repo.save(app);
    }
}
