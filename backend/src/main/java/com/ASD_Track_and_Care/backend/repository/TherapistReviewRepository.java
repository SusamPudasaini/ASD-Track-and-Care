package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.TherapistReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface TherapistReviewRepository extends JpaRepository<TherapistReview, Long> {

    boolean existsByBookingId(Long bookingId);

    Optional<TherapistReview> findByBookingId(Long bookingId);

    List<TherapistReview> findAllByTherapistIdOrderByCreatedAtDesc(Long therapistId);

    long countByTherapistIdAndRating(Long therapistId, Integer rating);

    @Query("select coalesce(avg(r.rating), 0.0) from TherapistReview r where r.therapistId = :therapistId")
    Double averageRatingByTherapistId(@Param("therapistId") Long therapistId);

    long countByTherapistId(Long therapistId);
}
