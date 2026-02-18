package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.BookingResponse;
import com.ASD_Track_and_Care.backend.dto.CreateBookingRequest;
import com.ASD_Track_and_Care.backend.dto.RescheduleBookingRequest;
import com.ASD_Track_and_Care.backend.model.Booking;
import com.ASD_Track_and_Care.backend.model.BookingStatus;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.BookingRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    public BookingService(BookingRepository bookingRepository, UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
    }

    public BookingResponse createBooking(Authentication auth, CreateBookingRequest req) {
        User me = getUserFromAuth(auth);

        User therapist = userRepository.findById(req.getTherapistId())
                .orElseThrow(() -> new RuntimeException("Therapist not found"));

        if (therapist.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Selected user is not a therapist");
        }

        LocalDate date = LocalDate.parse(req.getDate());
        String time = req.getTime().trim();

        // basic time validation: 09:00 to 18:00 (frontend already limits)
        if (!isValidTime(time)) {
            throw new RuntimeException("Invalid time. Allowed between 09:00 and 18:00");
        }

        // prevent double booking same therapist same time
        if (bookingRepository.existsByTherapistIdAndDateAndTime(therapist.getId(), date, time)) {
            throw new RuntimeException("This time slot is already booked. Please choose another time.");
        }

        Booking b = new Booking();
        b.setUserId(me.getId());
        b.setTherapistId(therapist.getId());
        b.setDate(date);
        b.setTime(time);
        b.setStatus(BookingStatus.CONFIRMED);

        if (req.getPidx() != null && !req.getPidx().isBlank()) {
            b.setKhaltiPidx(req.getPidx().trim());
        }

        bookingRepository.save(b);
        return toResponse(b, therapist);
    }

    public List<BookingResponse> myBookings(Authentication auth) {
        User me = getUserFromAuth(auth);

        List<Booking> list = bookingRepository.findAllByUserIdOrderByCreatedAtDesc(me.getId());

        return list.stream().map(b -> {
            User therapist = userRepository.findById(b.getTherapistId()).orElse(null);
            return toResponse(b, therapist);
        }).collect(Collectors.toList());
    }

    public BookingResponse reschedule(Authentication auth, Long bookingId, RescheduleBookingRequest req) {
        User me = getUserFromAuth(auth);

        Booking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!b.getUserId().equals(me.getId())) {
            throw new RuntimeException("Not allowed");
        }

        if (b.getStatus() == BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking already cancelled");
        }

        LocalDate newDate = LocalDate.parse(req.getDate());
        String newTime = req.getTime().trim();

        if (!isValidTime(newTime)) {
            throw new RuntimeException("Invalid time. Allowed between 09:00 and 18:00");
        }

        // prevent therapist conflict
        if (bookingRepository.existsByTherapistIdAndDateAndTime(b.getTherapistId(), newDate, newTime)) {
            throw new RuntimeException("This time slot is already booked. Please choose another time.");
        }

        b.setDate(newDate);
        b.setTime(newTime);
        bookingRepository.save(b);

        User therapist = userRepository.findById(b.getTherapistId()).orElse(null);
        return toResponse(b, therapist);
    }

    public void cancel(Authentication auth, Long bookingId) {
        User me = getUserFromAuth(auth);

        Booking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!b.getUserId().equals(me.getId())) {
            throw new RuntimeException("Not allowed");
        }

        b.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(b);
    }

    private BookingResponse toResponse(Booking b, User therapist) {
        BookingResponse r = new BookingResponse();
        r.setId(b.getId());
        r.setDate(b.getDate().toString());
        r.setTime(b.getTime());
        r.setStatus(b.getStatus().name());

        r.setTherapistId(b.getTherapistId());

        if (therapist != null) {
            String name = (therapist.getFirstName() + " " + therapist.getLastName()).trim();
            r.setTherapistName(name);
            r.setTherapistEmail(therapist.getUserEmail());
            r.setTherapistPhone(therapist.getPhoneNumber());
            r.setTherapistProfilePictureUrl(therapist.getProfilePictureUrl());
        } else {
            r.setTherapistName("Therapist");
        }

        return r;
    }

    private User getUserFromAuth(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private boolean isValidTime(String time) {
        // Accept HH:mm from 09:00 to 18:00
        // minimal validation (front-end already controls this)
        try {
            String[] parts = time.split(":");
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            if (!(m == 0 || m == 30)) return false;
            if (h < 9) return false;
            if (h > 18) return false;
            if (h == 18 && m != 0) return false;
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
