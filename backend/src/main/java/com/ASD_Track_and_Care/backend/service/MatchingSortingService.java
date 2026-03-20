package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.*;
import com.ASD_Track_and_Care.backend.model.MatchingSortingActivity;
import com.ASD_Track_and_Care.backend.model.MatchingSortingItem;
import com.ASD_Track_and_Care.backend.model.MatchingSortingType;
import com.ASD_Track_and_Care.backend.repository.MatchingSortingActivityRepository;
import com.ASD_Track_and_Care.backend.repository.MatchingSortingItemRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MatchingSortingService {

    private final MatchingSortingActivityRepository activityRepository;
    private final MatchingSortingItemRepository itemRepository;

    public MatchingSortingService(
            MatchingSortingActivityRepository activityRepository,
            MatchingSortingItemRepository itemRepository
    ) {
        this.activityRepository = activityRepository;
        this.itemRepository = itemRepository;
    }

    public List<MatchingSortingActivityResponse> listAllForAdmin() {
        return activityRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<MatchingSortingActivityResponse> listActiveForUsers(MatchingSortingType type) {
        List<MatchingSortingActivity> rows = (type == null)
                ? activityRepository.findAllByActiveTrueOrderByCreatedAtDesc()
                : activityRepository.findAllByActiveTrueAndTypeOrderByCreatedAtDesc(type);

        return rows.stream().map(this::toDto).toList();
    }

    public MatchingSortingActivityResponse getActiveActivityForUser(Long id) {
        MatchingSortingActivity activity = requireActivity(id);

        if (!activity.isActive()) {
            throw new RuntimeException("Activity is not available");
        }

        return toDto(activity);
    }

    public MatchingSortingActivityResponse createActivity(CreateMatchingSortingActivityRequest req) {
        validateByType(req.getType(), req.getItems());

        MatchingSortingActivity activity = new MatchingSortingActivity();
        activity.setTitle(req.getTitle().trim());
        activity.setDescription(blankToNull(req.getDescription()));
        activity.setType(req.getType());
        activity.setActive(req.getActive() == null || req.getActive());

        List<MatchingSortingItem> items = buildItems(req.getItems(), activity);
        activity.setItems(items);

        activityRepository.save(activity);
        return toDto(activity);
    }

    public MatchingSortingActivityResponse updateActivity(Long id, UpdateMatchingSortingActivityRequest req) {
        validateByType(req.getType(), req.getItems());

        MatchingSortingActivity activity = requireActivity(id);
        activity.setTitle(req.getTitle().trim());
        activity.setDescription(blankToNull(req.getDescription()));
        activity.setType(req.getType());
        activity.setActive(req.getActive() == null || req.getActive());

        activity.getItems().clear();
        activity.getItems().addAll(buildItems(req.getItems(), activity));

        activityRepository.save(activity);
        return toDto(activity);
    }

    public MatchingSortingActivityResponse toggleActive(Long id, boolean active) {
        MatchingSortingActivity activity = requireActivity(id);
        activity.setActive(active);
        activityRepository.save(activity);
        return toDto(activity);
    }

    public void deleteActivity(Long id) {
        MatchingSortingActivity activity = requireActivity(id);
        activityRepository.delete(activity);
    }

    private MatchingSortingActivity requireActivity(Long id) {
        return activityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matching/Sorting activity not found"));
    }

    private List<MatchingSortingItem> buildItems(
            List<MatchingSortingItemRequest> reqItems,
            MatchingSortingActivity activity
    ) {
        List<MatchingSortingItem> items = new ArrayList<>();

        if (reqItems == null) return items;

        for (MatchingSortingItemRequest reqItem : reqItems) {
            if (reqItem == null) continue;

            String label = reqItem.getLabel() == null ? "" : reqItem.getLabel().trim();
            if (label.isEmpty()) continue;

            MatchingSortingItem item = new MatchingSortingItem();
            item.setActivity(activity);
            item.setLabel(label);
            item.setImageUrl(blankToNull(reqItem.getImageUrl()));
            item.setCategoryKey(blankToNullUpper(reqItem.getCategoryKey()));
            item.setMatchKey(blankToNullUpper(reqItem.getMatchKey()));
            item.setSortOrder(reqItem.getSortOrder() == null ? 0 : reqItem.getSortOrder());

            items.add(item);
        }

        return items;
    }

    private void validateByType(MatchingSortingType type, List<MatchingSortingItemRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("At least one item is required");
        }

        boolean hasValidItem = items.stream().anyMatch(i ->
                i != null &&
                i.getLabel() != null &&
                !i.getLabel().trim().isEmpty()
        );

        if (!hasValidItem) {
            throw new RuntimeException("At least one valid item is required");
        }

        if (type == MatchingSortingType.MATCHING) {
            boolean allHaveMatchKey = items.stream()
                    .filter(i -> i != null && i.getLabel() != null && !i.getLabel().trim().isEmpty())
                    .allMatch(i -> i.getMatchKey() != null && !i.getMatchKey().trim().isEmpty());

            if (!allHaveMatchKey) {
                throw new RuntimeException("All matching items must have a match key");
            }
        }

        if (type == MatchingSortingType.SORTING) {
            boolean allHaveCategoryKey = items.stream()
                    .filter(i -> i != null && i.getLabel() != null && !i.getLabel().trim().isEmpty())
                    .allMatch(i -> i.getCategoryKey() != null && !i.getCategoryKey().trim().isEmpty());

            if (!allHaveCategoryKey) {
                throw new RuntimeException("All sorting items must have a category key");
            }
        }
    }

    private MatchingSortingActivityResponse toDto(MatchingSortingActivity activity) {
        MatchingSortingActivityResponse dto = new MatchingSortingActivityResponse();
        dto.setId(activity.getId());
        dto.setTitle(activity.getTitle());
        dto.setDescription(activity.getDescription());
        dto.setType(activity.getType());
        dto.setActive(activity.isActive());
        dto.setCreatedAt(activity.getCreatedAt());
        dto.setUpdatedAt(activity.getUpdatedAt());

        List<MatchingSortingItemResponse> itemDtos = activity.getItems().stream().map(item -> {
            MatchingSortingItemResponse x = new MatchingSortingItemResponse();
            x.setId(item.getId());
            x.setLabel(item.getLabel());
            x.setImageUrl(item.getImageUrl());
            x.setCategoryKey(item.getCategoryKey());
            x.setMatchKey(item.getMatchKey());
            x.setSortOrder(item.getSortOrder());
            return x;
        }).toList();

        dto.setItems(itemDtos);
        return dto;
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return value.trim();
    }

    private String blankToNullUpper(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return value.trim().toUpperCase();
    }
}