package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.DayCareCenter;
import com.ASD_Track_and_Care.backend.model.DayCareUserReview;
import com.ASD_Track_and_Care.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DayCareUserReviewRepository extends JpaRepository<DayCareUserReview, Long> {
    List<DayCareUserReview> findAllByDayCareCenterOrderByCreatedAtDesc(DayCareCenter dayCareCenter);
    Optional<DayCareUserReview> findByDayCareCenterAndUser(DayCareCenter dayCareCenter, User user);
    long countByDayCareCenter(DayCareCenter dayCareCenter);
}