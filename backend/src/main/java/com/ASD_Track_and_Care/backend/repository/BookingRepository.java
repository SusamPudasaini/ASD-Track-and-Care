package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByTherapistIdAndDateAndTime(Long therapistId, LocalDate date, String time);

    List<Booking> findAllByTherapistIdAndDate(Long therapistId, LocalDate date);

    List<Booking> findAllByTherapistIdOrderByCreatedAtDesc(Long therapistId);

    List<Booking> findAllByTherapistIdAndDateAndTime(Long therapistId, LocalDate date, String time);

    Optional<Booking> findByKhaltiPidx(String khaltiPidx);

    Optional<Booking> findByPurchaseOrderId(String purchaseOrderId);
}