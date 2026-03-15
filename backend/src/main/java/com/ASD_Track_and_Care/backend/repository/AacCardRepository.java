package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.AacCard;
import com.ASD_Track_and_Care.backend.model.AacCardCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AacCardRepository extends JpaRepository<AacCard, Long> {
    List<AacCard> findAllByOrderByCategoryAscSortOrderAscLabelAsc();
    List<AacCard> findAllByActiveTrueOrderByCategoryAscSortOrderAscLabelAsc();
    List<AacCard> findAllByActiveTrueAndCategoryOrderBySortOrderAscLabelAsc(AacCardCategory category);
}