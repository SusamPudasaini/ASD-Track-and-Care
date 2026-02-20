package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.ActivityResultCreateRequest;
import com.ASD_Track_and_Care.backend.dto.ActivityResultResponse;
import com.ASD_Track_and_Care.backend.model.ActivityResult;
import com.ASD_Track_and_Care.backend.model.ActivityType;
import com.ASD_Track_and_Care.backend.repository.ActivityResultRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ActivityResultService {

    private final ActivityResultRepository repo;
    private final ObjectMapper objectMapper;

    public ActivityResultService(ActivityResultRepository repo, ObjectMapper objectMapper) {
        this.repo = repo;
        this.objectMapper = objectMapper;
    }

    public ActivityResultResponse save(String username, ActivityResultCreateRequest req) {
        ActivityType type = ActivityType.valueOf(req.type.toUpperCase());

        String detailsJson = null;
        try {
            if (req.details != null) detailsJson = objectMapper.writeValueAsString(req.details);
        } catch (Exception ignored) {}

        ActivityResult saved = repo.save(new ActivityResult(
                type,
                req.score == null ? 0.0 : req.score,
                detailsJson,
                username
        ));

        return new ActivityResultResponse(
                saved.getId(),
                saved.getType().name(),
                saved.getScore(),
                saved.getDetailsJson(),
                saved.getCreatedAt()
        );
    }

    public List<ActivityResultResponse> history(String username, String typeStr, int limit) {
        ActivityType type = ActivityType.valueOf(typeStr.toUpperCase());
        int safeLimit = Math.min(Math.max(limit, 1), 100);

        return repo.findByUsernameAndTypeOrderByCreatedAtDesc(
                username,
                type,
                PageRequest.of(0, safeLimit)
        ).stream().map(r -> new ActivityResultResponse(
                r.getId(),
                r.getType().name(),
                r.getScore(),
                r.getDetailsJson(),
                r.getCreatedAt()
        )).toList();
    }
}