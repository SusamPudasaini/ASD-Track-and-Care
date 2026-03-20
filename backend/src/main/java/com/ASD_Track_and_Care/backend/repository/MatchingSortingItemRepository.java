package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.MatchingSortingActivity;
import com.ASD_Track_and_Care.backend.model.MatchingSortingItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchingSortingItemRepository extends JpaRepository<MatchingSortingItem, Long> {

    List<MatchingSortingItem> findAllByActivityOrderBySortOrderAscIdAsc(MatchingSortingActivity activity);
}