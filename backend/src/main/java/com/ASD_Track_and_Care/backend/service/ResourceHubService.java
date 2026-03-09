package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.CreateResourceHubItemRequest;
import com.ASD_Track_and_Care.backend.dto.ResourceHubItemResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateResourceHubItemRequest;
import com.ASD_Track_and_Care.backend.model.ResourceCategory;
import com.ASD_Track_and_Care.backend.model.ResourceHubItem;
import com.ASD_Track_and_Care.backend.repository.ResourceHubItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ResourceHubService {

    private final ResourceHubItemRepository resourceHubItemRepository;

    public ResourceHubService(ResourceHubItemRepository resourceHubItemRepository) {
        this.resourceHubItemRepository = resourceHubItemRepository;
    }

    public ResourceHubItemResponse create(CreateResourceHubItemRequest req) {
        ResourceHubItem item = new ResourceHubItem();
        apply(item, req);
        resourceHubItemRepository.save(item);
        return toDto(item);
    }

    public ResourceHubItemResponse update(Long id, UpdateResourceHubItemRequest req) {
        ResourceHubItem item = resourceHubItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource not found"));

        apply(item, req);
        resourceHubItemRepository.save(item);
        return toDto(item);
    }

    public List<ResourceHubItemResponse> adminList() {
        return resourceHubItemRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<ResourceHubItemResponse> userList(String category) {
        List<ResourceHubItem> items;

        if (category == null || category.isBlank()) {
            items = resourceHubItemRepository.findAllByPublishedTrueOrderByCreatedAtDesc();
        } else {
            ResourceCategory parsed = ResourceCategory.valueOf(category.toUpperCase());
            items = resourceHubItemRepository.findAllByPublishedTrueAndCategoryOrderByCreatedAtDesc(parsed);
        }

        return items.stream().map(this::toDto).toList();
    }

    public ResourceHubItemResponse getByIdForUser(Long id) {
        ResourceHubItem item = resourceHubItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource not found"));

        if (!item.isPublished()) {
            throw new RuntimeException("Resource not found");
        }

        return toDto(item);
    }

    public ResourceHubItemResponse getByIdForAdmin(Long id) {
        ResourceHubItem item = resourceHubItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource not found"));
        return toDto(item);
    }

    public ResourceHubItemResponse setPublished(Long id, boolean published) {
        ResourceHubItem item = resourceHubItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource not found"));

        item.setPublished(published);
        resourceHubItemRepository.save(item);
        return toDto(item);
    }

    private void apply(ResourceHubItem item, CreateResourceHubItemRequest req) {
        item.setTitle(req.getTitle().trim());
        item.setDescription(req.getDescription().trim());
        item.setContentType(req.getContentType());
        item.setCategory(req.getCategory());
        item.setThumbnailUrl(trimToNull(req.getThumbnailUrl()));
        item.setVideoUrl(trimToNull(req.getVideoUrl()));
        item.setFileUrl(trimToNull(req.getFileUrl()));
        item.setExternalUrl(trimToNull(req.getExternalUrl()));
        item.setContentBody(trimToNull(req.getContentBody()));
        item.setPublished(Boolean.TRUE.equals(req.getPublished()));
    }

    private void apply(ResourceHubItem item, UpdateResourceHubItemRequest req) {
        item.setTitle(req.getTitle().trim());
        item.setDescription(req.getDescription().trim());
        item.setContentType(req.getContentType());
        item.setCategory(req.getCategory());
        item.setThumbnailUrl(trimToNull(req.getThumbnailUrl()));
        item.setVideoUrl(trimToNull(req.getVideoUrl()));
        item.setFileUrl(trimToNull(req.getFileUrl()));
        item.setExternalUrl(trimToNull(req.getExternalUrl()));
        item.setContentBody(trimToNull(req.getContentBody()));
        item.setPublished(Boolean.TRUE.equals(req.getPublished()));
    }

    private String trimToNull(String v) {
        if (v == null) return null;
        String s = v.trim();
        return s.isEmpty() ? null : s;
    }

    private ResourceHubItemResponse toDto(ResourceHubItem item) {
        ResourceHubItemResponse dto = new ResourceHubItemResponse();
        dto.setId(item.getId());
        dto.setTitle(item.getTitle());
        dto.setDescription(item.getDescription());
        dto.setContentType(item.getContentType());
        dto.setCategory(item.getCategory());
        dto.setThumbnailUrl(item.getThumbnailUrl());
        dto.setVideoUrl(item.getVideoUrl());
        dto.setFileUrl(item.getFileUrl());
        dto.setExternalUrl(item.getExternalUrl());
        dto.setContentBody(item.getContentBody());
        dto.setPublished(item.isPublished());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());
        return dto;
    }
}