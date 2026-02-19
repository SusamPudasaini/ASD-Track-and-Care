package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.AvailabilityDay;
import com.ASD_Track_and_Care.backend.model.TherapistTimeSlot;

import jakarta.transaction.Transactional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;

public interface TherapistTimeSlotRepository extends JpaRepository<TherapistTimeSlot, Long> {
	@Modifying
	@Transactional
    void deleteAllByTherapistId(Long therapistId);

    List<TherapistTimeSlot> findAllByTherapistIdAndDayOrderByTimeAsc(Long therapistId, AvailabilityDay day);

    List<TherapistTimeSlot> findAllByTherapistId(Long therapistId);
}
