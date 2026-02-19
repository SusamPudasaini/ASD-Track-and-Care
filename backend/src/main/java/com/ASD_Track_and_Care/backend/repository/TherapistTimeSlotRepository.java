package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.AvailabilityDay;
import com.ASD_Track_and_Care.backend.model.TherapistTimeSlot;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TherapistTimeSlotRepository extends JpaRepository<TherapistTimeSlot, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("delete from TherapistTimeSlot t where t.therapistId = :therapistId")
    void deleteAllByTherapistId(@Param("therapistId") Long therapistId);

    boolean existsByTherapistId(Long therapistId);

    List<TherapistTimeSlot> findAllByTherapistIdAndDayOrderByTimeAsc(Long therapistId, AvailabilityDay day);

    List<TherapistTimeSlot> findAllByTherapistId(Long therapistId);
    
    long countByTherapistId(Long therapistId);

}
