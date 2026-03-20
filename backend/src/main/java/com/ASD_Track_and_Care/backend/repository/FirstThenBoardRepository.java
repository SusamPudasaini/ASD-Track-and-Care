package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.FirstThenBoard;
import com.ASD_Track_and_Care.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FirstThenBoardRepository extends JpaRepository<FirstThenBoard, Long> {

    List<FirstThenBoard> findAllByUserOrderByCreatedAtDesc(User user);

    List<FirstThenBoard> findAllByUserAndActiveTrueOrderByCreatedAtDesc(User user);
}