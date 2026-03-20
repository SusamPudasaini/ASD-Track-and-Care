package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.MatchingSortingActivity;
import com.ASD_Track_and_Care.backend.model.MatchingSortingType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchingSortingActivityRepository extends JpaRepository<MatchingSortingActivity, Long> {

    List<MatchingSortingActivity> findAllByOrderByCreatedAtDesc();

    List<MatchingSortingActivity> findAllByActiveTrueOrderByCreatedAtDesc();

    List<MatchingSortingActivity> findAllByActiveTrueAndTypeOrderByCreatedAtDesc(MatchingSortingType type);
}