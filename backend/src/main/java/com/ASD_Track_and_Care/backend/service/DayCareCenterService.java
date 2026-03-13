package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.CreateDayCareCenterRequest;
import com.ASD_Track_and_Care.backend.dto.DayCareCenterResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateDayCareCenterRequest;
import com.ASD_Track_and_Care.backend.model.DayCareCategory;
import com.ASD_Track_and_Care.backend.model.DayCareCenter;
import com.ASD_Track_and_Care.backend.repository.DayCareCenterRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DayCareCenterService {

    private final DayCareCenterRepository dayCareCenterRepository;

    public DayCareCenterService(DayCareCenterRepository dayCareCenterRepository) {
        this.dayCareCenterRepository = dayCareCenterRepository;
    }

    public DayCareCenterResponse create(CreateDayCareCenterRequest req) {
        DayCareCenter item = new DayCareCenter();
        apply(item, req);
        dayCareCenterRepository.save(item);
        return toDto(item);
    }

    public DayCareCenterResponse update(Long id, UpdateDayCareCenterRequest req) {
        DayCareCenter item = dayCareCenterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Day care center not found"));

        apply(item, req);
        dayCareCenterRepository.save(item);
        return toDto(item);
    }

    public List<DayCareCenterResponse> adminList() {
        return dayCareCenterRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<DayCareCenterResponse> userList(String category) {
        List<DayCareCenter> items;

        if (category == null || category.isBlank()) {
            items = dayCareCenterRepository.findAllByPublishedTrueOrderByCreatedAtDesc();
        } else {
            DayCareCategory parsed = DayCareCategory.valueOf(category.toUpperCase());
            items = dayCareCenterRepository.findAllByPublishedTrueAndCategoryOrderByCreatedAtDesc(parsed);
        }

        return items.stream().map(this::toDto).toList();
    }

    public DayCareCenterResponse getByIdForUser(Long id) {
        DayCareCenter item = dayCareCenterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Day care center not found"));

        if (!item.isPublished()) {
            throw new RuntimeException("Day care center not found");
        }

        return toDto(item);
    }

    public DayCareCenterResponse getByIdForAdmin(Long id) {
        DayCareCenter item = dayCareCenterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Day care center not found"));
        return toDto(item);
    }

    public DayCareCenterResponse setPublished(Long id, boolean published) {
        DayCareCenter item = dayCareCenterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Day care center not found"));

        item.setPublished(published);
        dayCareCenterRepository.save(item);
        return toDto(item);
    }

    private void apply(DayCareCenter item, CreateDayCareCenterRequest req) {
        item.setName(req.getName().trim());
        item.setDescription(req.getDescription().trim());
        item.setCategory(req.getCategory());
        item.setAddress(req.getAddress().trim());
        item.setLatitude(req.getLatitude());
        item.setLongitude(req.getLongitude());
        item.setPhone(trimToNull(req.getPhone()));
        item.setEmail(trimToNull(req.getEmail()));
        item.setWebsiteUrl(trimToNull(req.getWebsiteUrl()));
        item.setImageUrl(trimToNull(req.getImageUrl()));
        item.setGoogleMapsUrl(trimToNull(req.getGoogleMapsUrl()));
        item.setGooglePlaceId(trimToNull(req.getGooglePlaceId()));
        item.setPublished(Boolean.TRUE.equals(req.getPublished()));
    }

    private void apply(DayCareCenter item, UpdateDayCareCenterRequest req) {
        item.setName(req.getName().trim());
        item.setDescription(req.getDescription().trim());
        item.setCategory(req.getCategory());
        item.setAddress(req.getAddress().trim());
        item.setLatitude(req.getLatitude());
        item.setLongitude(req.getLongitude());
        item.setPhone(trimToNull(req.getPhone()));
        item.setEmail(trimToNull(req.getEmail()));
        item.setWebsiteUrl(trimToNull(req.getWebsiteUrl()));
        item.setImageUrl(trimToNull(req.getImageUrl()));
        item.setGoogleMapsUrl(trimToNull(req.getGoogleMapsUrl()));
        item.setGooglePlaceId(trimToNull(req.getGooglePlaceId()));
        item.setPublished(Boolean.TRUE.equals(req.getPublished()));
    }

    private String trimToNull(String v) {
        if (v == null) return null;
        String s = v.trim();
        return s.isEmpty() ? null : s;
    }

    private DayCareCenterResponse toDto(DayCareCenter item) {
        DayCareCenterResponse dto = new DayCareCenterResponse();
        dto.setId(item.getId());
        dto.setName(item.getName());
        dto.setDescription(item.getDescription());
        dto.setCategory(item.getCategory());
        dto.setAddress(item.getAddress());
        dto.setLatitude(item.getLatitude());
        dto.setLongitude(item.getLongitude());
        dto.setPhone(item.getPhone());
        dto.setEmail(item.getEmail());
        dto.setWebsiteUrl(item.getWebsiteUrl());
        dto.setImageUrl(item.getImageUrl());
        dto.setGoogleMapsUrl(item.getGoogleMapsUrl());
        dto.setGooglePlaceId(item.getGooglePlaceId());
        dto.setAverageRating(item.getAverageRating());
        dto.setTotalReviews(item.getTotalReviews());
        dto.setPublished(item.isPublished());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());
        return dto;
    }
}