package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.BookingChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingChatMessageRepository extends JpaRepository<BookingChatMessage, Long> {

    List<BookingChatMessage> findAllByBookingIdOrderBySentAtAsc(Long bookingId);
}
