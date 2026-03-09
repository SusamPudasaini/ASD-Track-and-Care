package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.DayCareCategory;
import com.ASD_Track_and_Care.backend.model.DayCareCenter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DayCareCenterRepository extends JpaRepository<DayCareCenter, Long> {
    List<DayCareCenter> findAllByOrderByCreatedAtDesc();
    List<DayCareCenter> findAllByPublishedTrueOrderByCreatedAtDesc();
    List<DayCareCenter> findAllByPublishedTrueAndCategoryOrderByCreatedAtDesc(DayCareCategory category);
}