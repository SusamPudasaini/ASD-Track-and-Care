package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.ActivityResult;
import com.ASD_Track_and_Care.backend.model.ActivityType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityResultRepository extends JpaRepository<ActivityResult, Long> {
	  List<ActivityResult> findByUsernameOrderByCreatedAtDesc(String username, Pageable pageable);

	    List<ActivityResult> findByUsernameAndTypeOrderByCreatedAtDesc(String username, ActivityType type, Pageable pageable);
	}