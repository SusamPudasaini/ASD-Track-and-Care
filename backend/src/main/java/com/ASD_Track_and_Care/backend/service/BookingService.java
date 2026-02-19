package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.BookingResponse;
import com.ASD_Track_and_Care.backend.dto.CreateBookingRequest;
import com.ASD_Track_and_Care.backend.dto.RescheduleBookingRequest;
import com.ASD_Track_and_Care.backend.model.*;
import com.ASD_Track_and_Care.backend.repository.BookingRepository;
import com.ASD_Track_and_Care.backend.repository.TherapistTimeSlotRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final TherapistTimeSlotRepository timeSlotRepository;

    public BookingService(
            BookingRepository bookingRepository,
            UserRepository userRepository,
            TherapistTimeSlotRepository timeSlotRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.timeSlotRepository = timeSlotRepository;
    }

    public BookingResponse createBooking(Authentication auth, CreateBookingRequest req) {
        User me = getUserFromAuth(auth);

        User therapist = userRepository.findById(req.getTherapistId())
                .orElseThrow(() -> new RuntimeException("Therapist not found"));

        if (therapist.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Selected user is not a therapist");
        }

        LocalDate date = parseDate(req.getDate());
        String time = normalizeTime(req.getTime());

        // ✅ Block past bookings
        validateNotPast(date, time);

        // ✅ Validate time format + range
        if (!isValidTime(time)) {
            throw new RuntimeException("Invalid time. Allowed: 09:00 to 18:00 (30-min steps).");
        }

        // ✅ Must exist in therapist availability for that weekday
        ensureTherapistHasSlot(therapist.getId(), date, time);

        // ✅ Prevent double booking same therapist same date/time
        if (bookingRepository.existsByTherapistIdAndDateAndTime(therapist.getId(), date, time)) {
            throw new RuntimeException("This time slot is already booked. Please choose another time.");
        }

        Booking b = new Booking();
        b.setUserId(me.getId());
        b.setTherapistId(therapist.getId());
        b.setDate(date);
        b.setTime(time);
        b.setStatus(BookingStatus.CONFIRMED);

        // Khalti optional for now
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

        LocalDate newDate = parseDate(req.getDate());
        String newTime = normalizeTime(req.getTime());

        // ✅ Block past reschedules
        validateNotPast(newDate, newTime);

        if (!isValidTime(newTime)) {
            throw new RuntimeException("Invalid time. Allowed: 09:00 to 18:00 (30-min steps).");
        }

        // ✅ Must exist in therapist availability for that weekday
        ensureTherapistHasSlot(b.getTherapistId(), newDate, newTime);

        // ✅ If user picks same current slot, allow it
        boolean sameAsCurrent = b.getDate().equals(newDate) && b.getTime().equals(newTime);

        // ✅ Prevent therapist conflict (only if changing)
        if (!sameAsCurrent && bookingRepository.existsByTherapistIdAndDateAndTime(b.getTherapistId(), newDate, newTime)) {
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

    // ---------------- helpers ----------------

    private void ensureTherapistHasSlot(Long therapistId, LocalDate date, String time) {
        AvailabilityDay day = toAvailabilityDay(date);

        // therapist slots for weekday
        List<String> slots = timeSlotRepository.findAllByTherapistIdAndDayOrderByTimeAsc(therapistId, day)
                .stream()
                .map(TherapistTimeSlot::getTime)
                .collect(Collectors.toList());

        if (slots.isEmpty()) {
            throw new RuntimeException("Therapist is not available on " + day.name() + ".");
        }

        Set<String> slotSet = slots.stream().collect(Collectors.toSet());
        if (!slotSet.contains(time)) {
            throw new RuntimeException("Therapist is not available at " + time + " on " + day.name() + ".");
        }
    }

    private AvailabilityDay toAvailabilityDay(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case SUNDAY -> AvailabilityDay.Sunday;
            case MONDAY -> AvailabilityDay.Monday;
            case TUESDAY -> AvailabilityDay.Tuesday;
            case WEDNESDAY -> AvailabilityDay.Wednesday;
            case THURSDAY -> AvailabilityDay.Thursday;
            case FRIDAY -> AvailabilityDay.Friday;
            case SATURDAY -> AvailabilityDay.Saturday;
        };
    }

    private void validateNotPast(LocalDate date, String time) {
        LocalDate today = LocalDate.now();

        if (date.isBefore(today)) {
            throw new RuntimeException("You cannot book a session in the past.");
        }

        // If booking is for today, ensure time is not in the past
        if (date.equals(today)) {
            try {
                LocalTime t = LocalTime.parse(time);
                LocalTime now = LocalTime.now();

                // allow booking if time is after now
                if (t.isBefore(now)) {
                    throw new RuntimeException("Please choose a future time.");
                }
            } catch (Exception ignored) {
                // time format already validated elsewhere
            }
        }
    }

    private LocalDate parseDate(String dateStr) {
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            throw new RuntimeException("Invalid date format. Use YYYY-MM-DD.");
        }
    }

    private String normalizeTime(String time) {
        if (time == null) return "";
        return time.trim();
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
        try {
            String[] parts = time.split(":");
            if (parts.length != 2) return false;

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
