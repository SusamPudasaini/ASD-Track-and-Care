package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.model.TherapistApplicationDocument;
import com.ASD_Track_and_Care.backend.repository.TherapistApplicationDocumentRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/admin/therapist-documents")
public class AdminTherapistDocumentController {

    private final TherapistApplicationDocumentRepository docRepo;

    public AdminTherapistDocumentController(TherapistApplicationDocumentRepository docRepo) {
        this.docRepo = docRepo;
    }

    // ✅ Admin can download any document safely
    @GetMapping("/{docId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long docId) {
        TherapistApplicationDocument doc = docRepo.findById(docId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // filePath saved in DB (relative or absolute)
        Path filePath = Paths.get(doc.getFilePath()).normalize();

        Resource resource;
        try {
            resource = new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            throw new RuntimeException("Invalid file path");
        }

        if (!resource.exists()) {
            throw new RuntimeException("File not found on server");
        }

        String contentType = doc.getFileType() == null ? "application/octet-stream" : doc.getFileType();

        // Use title as filename-ish (fallback to docId)
        String safeName = (doc.getTitle() == null || doc.getTitle().isBlank())
                ? ("document-" + doc.getId())
                : doc.getTitle().replaceAll("[^a-zA-Z0-9._-]", "_");

        // If it's a PDF/image, inline open in browser
        boolean inline = contentType.startsWith("image/") || contentType.equals("application/pdf");
        String disposition = (inline ? "inline" : "attachment") + "; filename=\"" + safeName + "\"";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .body(resource);
    }
}
