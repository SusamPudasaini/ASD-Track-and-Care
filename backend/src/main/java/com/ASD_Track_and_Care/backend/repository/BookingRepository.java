package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByTherapistIdAndDateAndTime(Long therapistId, java.time.LocalDate date, String time);
}
