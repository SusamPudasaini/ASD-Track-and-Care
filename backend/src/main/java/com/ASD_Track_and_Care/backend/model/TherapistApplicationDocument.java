package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "therapist_application_documents")
public class TherapistApplicationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Many docs per application
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private TherapistApplication application;

    @Column(nullable = false, length = 200)
    private String title;

    // path or URL
    @Column(nullable = false, length = 500)
    private String filePath;

    @Column(nullable = false, length = 80)
    private String fileType;

    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    public TherapistApplicationDocument() {}

    public Long getId() { return id; }

    public TherapistApplication getApplication() { return application; }
    public void setApplication(TherapistApplication application) { this.application = application; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
}
