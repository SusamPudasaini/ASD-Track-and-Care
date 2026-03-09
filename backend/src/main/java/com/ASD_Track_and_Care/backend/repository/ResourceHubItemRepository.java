package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.ResourceCategory;
import com.ASD_Track_and_Care.backend.model.ResourceHubItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResourceHubItemRepository extends JpaRepository<ResourceHubItem, Long> {
    List<ResourceHubItem> findAllByOrderByCreatedAtDesc();
    List<ResourceHubItem> findAllByPublishedTrueOrderByCreatedAtDesc();
    List<ResourceHubItem> findAllByPublishedTrueAndCategoryOrderByCreatedAtDesc(ResourceCategory category);
}