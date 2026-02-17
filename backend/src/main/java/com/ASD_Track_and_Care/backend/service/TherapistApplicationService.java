package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.TherapistApplyRequest;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.TherapistApplication;
import com.ASD_Track_and_Care.backend.model.TherapistApplicationDocument;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.TherapistApplicationDocumentRepository;
import com.ASD_Track_and_Care.backend.repository.TherapistApplicationRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class TherapistApplicationService {

    private final TherapistApplicationRepository repo;
    private final TherapistApplicationDocumentRepository docRepo;
    private final UserRepository userRepository;
    private final EmailService emailService;

    private final Path uploadRoot = Path.of("uploads", "therapist-applications");

    public TherapistApplicationService(
            TherapistApplicationRepository repo,
            TherapistApplicationDocumentRepository docRepo,
            UserRepository userRepository,
            EmailService emailService
    ) {
        this.repo = repo;
        this.docRepo = docRepo;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @Transactional
    public TherapistApplication submit(
            String applicantUsername,
            TherapistApplyRequest req,
            List<String> documentTitles,
            List<MultipartFile> documentFiles
    ) {
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

        TherapistApplication saved = repo.save(app);

        saveDocumentsIfAny(saved, documentTitles, documentFiles);

        return saved;
    }

    private void saveDocumentsIfAny(
            TherapistApplication application,
            List<String> titles,
            List<MultipartFile> files
    ) {
        if (titles == null || files == null) return;
        if (titles.isEmpty() || files.isEmpty()) return;

        if (titles.size() != files.size()) {
            throw new IllegalArgumentException("Document titles and files count mismatch.");
        }

        try {
            Path appDir = uploadRoot.resolve(String.valueOf(application.getId()));
            Files.createDirectories(appDir);

            for (int i = 0; i < files.size(); i++) {
                String title = titles.get(i) == null ? "" : titles.get(i).trim();
                MultipartFile file = files.get(i);

                if (title.isEmpty() || file == null || file.isEmpty()) continue;

                String contentType = file.getContentType() == null ? "" : file.getContentType();

                boolean ok = contentType.equals("application/pdf") || contentType.startsWith("image/");
                if (!ok) {
                    throw new IllegalArgumentException("Only PDF or image documents are allowed.");
                }

                String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
                String safeName = UUID.randomUUID() + "-" + original.replaceAll("[^a-zA-Z0-9._-]", "_");
                Path dest = appDir.resolve(safeName);

                Files.copy(file.getInputStream(), dest);

                TherapistApplicationDocument doc = new TherapistApplicationDocument();
                doc.setApplication(application);
                doc.setTitle(title);
                doc.setFilePath(dest.toString());
                doc.setFileType(contentType);

                docRepo.save(doc);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to save documents: " + e.getMessage());
        }
    }

    // ✅ Admin: list by status
    public List<TherapistApplication> listByStatus(TherapistApplication.Status status) {
        return repo.findByStatusOrderByCreatedAtDesc(status);
    }

    // ✅ Admin: details endpoint (application + docs + URL)
    public Map<String, Object> getAdminDetails(Long applicationId) {
        TherapistApplication app = repo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        List<TherapistApplicationDocument> docs =
                docRepo.findByApplicationIdOrderByUploadedAtAsc(app.getId());

        Map<String, Object> appMap = new LinkedHashMap<>();
        appMap.put("id", app.getId());
        appMap.put("applicantUsername", app.getApplicantUsername());
        appMap.put("fullName", app.getFullName());
        appMap.put("email", app.getEmail());
        appMap.put("phone", app.getPhone());
        appMap.put("qualification", app.getQualification());
        appMap.put("licenseNumber", app.getLicenseNumber());
        appMap.put("yearsExperience", app.getYearsExperience());
        appMap.put("specialization", app.getSpecialization());
        appMap.put("workplace", app.getWorkplace());
        appMap.put("city", app.getCity());
        appMap.put("message", app.getMessage());
        appMap.put("status", app.getStatus().name());
        appMap.put("adminMessage", app.getAdminMessage());
        appMap.put("reviewedBy", app.getReviewedBy());
        appMap.put("reviewedAt", app.getReviewedAt() == null ? null : app.getReviewedAt().toString());
        appMap.put("createdAt", app.getCreatedAt() == null ? null : app.getCreatedAt().toString());

        List<Map<String, Object>> docList = new ArrayList<>();
        for (TherapistApplicationDocument d : docs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("title", d.getTitle());
            m.put("fileType", d.getFileType());
            m.put("uploadedAt", d.getUploadedAt() == null ? null : d.getUploadedAt().toString());
            m.put("url", "/api/admin/therapist-documents/" + d.getId() + "/download");
            docList.add(m);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("application", appMap);
        out.put("documents", docList);
        return out;
    }

    @Transactional
    public TherapistApplication approveApplication(Long applicationId, String adminUsername, String adminMessage) {
        TherapistApplication app = repo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (app.getStatus() != TherapistApplication.Status.PENDING) {
            throw new IllegalStateException("Only PENDING applications can be approved.");
        }

        User user = userRepository.findByUsername(app.getApplicantUsername())
                .orElseThrow(() -> new RuntimeException("User not found for applicant: " + app.getApplicantUsername()));

        user.setRole(Role.THERAPIST);
        userRepository.save(user);

        app.setStatus(TherapistApplication.Status.APPROVED);
        app.setAdminMessage(adminMessage);
        app.setReviewedBy(adminUsername);
        app.setReviewedAt(LocalDateTime.now());

        TherapistApplication saved = repo.save(app);

        emailService.sendTherapistApplicationDecisionEmail(app.getEmail(), saved.getStatus().name(), adminMessage);

        return saved;
    }

    @Transactional
    public TherapistApplication rejectApplication(Long applicationId, String adminUsername, String adminMessage) {
        TherapistApplication app = repo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (app.getStatus() != TherapistApplication.Status.PENDING) {
            throw new IllegalStateException("Only PENDING applications can be rejected.");
        }

        app.setStatus(TherapistApplication.Status.REJECTED);
        app.setAdminMessage(adminMessage);
        app.setReviewedBy(adminUsername);
        app.setReviewedAt(LocalDateTime.now());

        TherapistApplication saved = repo.save(app);

        emailService.sendTherapistApplicationDecisionEmail(app.getEmail(), saved.getStatus().name(), adminMessage);

        return saved;
    }

    // ✅ Admin: revert to pending
    @Transactional
    public TherapistApplication markPending(Long applicationId, String adminUsername, String adminMessage) {
        TherapistApplication app = repo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (app.getStatus() == TherapistApplication.Status.PENDING) {
            return app;
        }

        app.setStatus(TherapistApplication.Status.PENDING);
        app.setAdminMessage(adminMessage);
        app.setReviewedBy(adminUsername);
        app.setReviewedAt(LocalDateTime.now());

        return repo.save(app);
    }

    // ✅ User: get latest application + docs (your existing method)
    public Map<String, Object> getLatestForUser(String applicantUsername) {
        TherapistApplication app = repo.findTopByApplicantUsernameOrderByCreatedAtDesc(applicantUsername)
                .orElse(null);

        if (app == null) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("hasApplication", false);
            return out;
        }

        List<TherapistApplicationDocument> docs =
                docRepo.findByApplicationIdOrderByUploadedAtAsc(app.getId());

        Map<String, Object> appMap = new LinkedHashMap<>();
        appMap.put("id", app.getId());
        appMap.put("applicantUsername", app.getApplicantUsername());
        appMap.put("fullName", app.getFullName());
        appMap.put("email", app.getEmail());
        appMap.put("phone", app.getPhone());
        appMap.put("qualification", app.getQualification());
        appMap.put("licenseNumber", app.getLicenseNumber());
        appMap.put("yearsExperience", app.getYearsExperience());
        appMap.put("specialization", app.getSpecialization());
        appMap.put("workplace", app.getWorkplace());
        appMap.put("city", app.getCity());
        appMap.put("message", app.getMessage());
        appMap.put("status", app.getStatus().name());
        appMap.put("adminMessage", app.getAdminMessage());
        appMap.put("reviewedBy", app.getReviewedBy());
        appMap.put("reviewedAt", app.getReviewedAt() == null ? null : app.getReviewedAt().toString());
        appMap.put("createdAt", app.getCreatedAt() == null ? null : app.getCreatedAt().toString());

        List<Map<String, Object>> docList = new ArrayList<>();
        for (TherapistApplicationDocument d : docs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("title", d.getTitle());
            m.put("fileType", d.getFileType());
            m.put("uploadedAt", d.getUploadedAt() == null ? null : d.getUploadedAt().toString());
            m.put("url", "/api/therapists/documents/" + d.getId() + "/download"); // keep if you have this endpoint
            docList.add(m);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("hasApplication", true);
        out.put("application", appMap);
        out.put("documents", docList);

        return out;
    }

    // ✅ User: list application history by applicantUsername (JWT subject)
    public List<TherapistApplication> listMine(String applicantUsername) {
        // You may need to add this repo method if missing:
        // List<TherapistApplication> findByApplicantUsernameOrderByCreatedAtDesc(String applicantUsername);
        return repo.findByApplicantUsernameOrderByCreatedAtDesc(applicantUsername);
    }

    // ✅ User: details for ONE application (ownership check)
    public Map<String, Object> getMyDetails(Long applicationId, String applicantUsername) {
        TherapistApplication app = repo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (app.getApplicantUsername() == null || !app.getApplicantUsername().equals(applicantUsername)) {
            // don't leak existence
            throw new RuntimeException("Application not found");
        }

        List<TherapistApplicationDocument> docs =
                docRepo.findByApplicationIdOrderByUploadedAtAsc(app.getId());

        Map<String, Object> appMap = new LinkedHashMap<>();
        appMap.put("id", app.getId());
        appMap.put("applicantUsername", app.getApplicantUsername());
        appMap.put("fullName", app.getFullName());
        appMap.put("email", app.getEmail());
        appMap.put("phone", app.getPhone());
        appMap.put("qualification", app.getQualification());
        appMap.put("licenseNumber", app.getLicenseNumber());
        appMap.put("yearsExperience", app.getYearsExperience());
        appMap.put("specialization", app.getSpecialization());
        appMap.put("workplace", app.getWorkplace());
        appMap.put("city", app.getCity());
        appMap.put("message", app.getMessage());
        appMap.put("status", app.getStatus().name());
        appMap.put("adminMessage", app.getAdminMessage());
        appMap.put("reviewedBy", app.getReviewedBy());
        appMap.put("reviewedAt", app.getReviewedAt() == null ? null : app.getReviewedAt().toString());
        appMap.put("createdAt", app.getCreatedAt() == null ? null : app.getCreatedAt().toString());

        List<Map<String, Object>> docList = new ArrayList<>();
        for (TherapistApplicationDocument d : docs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("title", d.getTitle());
            m.put("fileType", d.getFileType());
            m.put("uploadedAt", d.getUploadedAt() == null ? null : d.getUploadedAt().toString());
            // optional: only add user download URL if you have a secure user download endpoint
            // m.put("url", "/api/therapist-applications/documents/" + d.getId() + "/download");
            docList.add(m);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("application", appMap);
        out.put("documents", docList);
        return out;
    }

    // (you can keep this, but it's risky if JWT subject is username)
    public List<TherapistApplication> listByApplicantEmail(String email) {
        return repo.findByEmailOrderByCreatedAtDesc(email);
    }
}
