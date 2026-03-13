package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.DayCareCenter;
import com.ASD_Track_and_Care.backend.model.DayCareGoogleReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DayCareGoogleReviewRepository extends JpaRepository<DayCareGoogleReview, Long> {
    List<DayCareGoogleReview> findAllByDayCareCenterOrderByCreatedAtDesc(DayCareCenter dayCareCenter);
    void deleteAllByDayCareCenter(DayCareCenter dayCareCenter);
}