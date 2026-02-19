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
    private final EmailService emailService;

    public BookingService(
            BookingRepository bookingRepository,
            UserRepository userRepository,
            TherapistTimeSlotRepository timeSlotRepository,
            EmailService emailService
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.emailService = emailService;
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

        validateNotPast(date, time);

        if (!isValidTime(time)) {
            throw new RuntimeException("Invalid time. Allowed: 09:00 to 18:00 (30-min steps).");
        }

        ensureTherapistHasSlot(therapist.getId(), date, time);

        if (existsActiveBookingForTherapistSlot(therapist.getId(), date, time)) {
            throw new RuntimeException("This time slot is already booked. Please choose another time.");
        }

        Booking b = new Booking();
        b.setUserId(me.getId());
        b.setTherapistId(therapist.getId());
        b.setDate(date);
        b.setTime(time);

        b.setStatus(BookingStatus.PENDING);

        if (req.getPidx() != null && !req.getPidx().isBlank()) {
            b.setKhaltiPidx(req.getPidx().trim());
        }

        // new booking => clear any message
        b.setTherapistMessage(null);

        bookingRepository.save(b);

        return toResponseForUserView(b, therapist);
    }

    public List<BookingResponse> myBookings(Authentication auth) {
        User me = getUserFromAuth(auth);

        List<Booking> list = bookingRepository.findAllByUserIdOrderByCreatedAtDesc(me.getId());

        return list.stream().map(b -> {
            User therapist = userRepository.findById(b.getTherapistId()).orElse(null);
            return toResponseForUserView(b, therapist);
        }).collect(Collectors.toList());
    }

    public List<BookingResponse> therapistBookings(Authentication auth) {
        User therapist = getUserFromAuth(auth);

        if (therapist.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Not allowed");
        }

        List<Booking> list = bookingRepository.findAllByTherapistIdOrderByCreatedAtDesc(therapist.getId());

        return list.stream().map(b -> {
            User booker = userRepository.findById(b.getUserId()).orElse(null);
            return toResponseForTherapistView(b, therapist, booker);
        }).collect(Collectors.toList());
    }

    // ✅ Therapist approves PENDING -> CONFIRMED
    public BookingResponse approve(Authentication auth, Long bookingId) {
        User therapist = getUserFromAuth(auth);

        if (therapist.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Not allowed");
        }

        Booking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!b.getTherapistId().equals(therapist.getId())) {
            throw new RuntimeException("Not allowed");
        }

        if (b.getStatus() == BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking already cancelled");
        }

        if (b.getStatus() != BookingStatus.PENDING && b.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("Booking is not pending");
        }

        // Idempotent
        if (b.getStatus() == BookingStatus.CONFIRMED) {
            User booker = userRepository.findById(b.getUserId()).orElse(null);
            return toResponseForTherapistView(b, therapist, booker);
        }

        if (existsOtherActiveBookingForTherapistSlot(b.getId(), b.getTherapistId(), b.getDate(), b.getTime())) {
            throw new RuntimeException("This time slot is no longer available.");
        }

        b.setStatus(BookingStatus.CONFIRMED);

        // ✅ optional: clear previous cancel reason when confirming again
        b.setTherapistMessage(null);

        bookingRepository.save(b);

        User booker = userRepository.findById(b.getUserId()).orElse(null);
        return toResponseForTherapistView(b, therapist, booker);
    }

    /**
     * ✅ Therapist declines/cancels -> CANCELLED (WITH MESSAGE)
     * message is optional, but will be stored and emailed.
     */
    public BookingResponse decline(Authentication auth, Long bookingId, String therapistMessage) {
        User therapist = getUserFromAuth(auth);

        if (therapist.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Not allowed");
        }

        Booking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!b.getTherapistId().equals(therapist.getId())) {
            throw new RuntimeException("Not allowed");
        }

        String msg = (therapistMessage == null || therapistMessage.trim().isEmpty())
                ? null
                : therapistMessage.trim();

        // store message (even if already cancelled, allow updating message)
        b.setTherapistMessage(msg);

        if (b.getStatus() != BookingStatus.CANCELLED) {
            b.setStatus(BookingStatus.CANCELLED);
        }

        bookingRepository.save(b);

        User booker = userRepository.findById(b.getUserId()).orElse(null);

        // ✅ email user if we can
        if (booker != null && booker.getUserEmail() != null && !booker.getUserEmail().isBlank()) {
            String therapistName = (therapist.getFirstName() + " " + therapist.getLastName()).trim();
            emailService.sendBookingCancelledEmail(
                    booker.getUserEmail(),
                    therapistName,
                    b.getDate() == null ? null : b.getDate().toString(),
                    b.getTime(),
                    msg
            );
        }

        return toResponseForTherapistView(b, therapist, booker);
    }

    // ✅ keep your old signature too (optional safety if something still calls it)
    public BookingResponse decline(Authentication auth, Long bookingId) {
        return decline(auth, bookingId, null);
    }

    // ✅ Therapist can revert CONFIRMED/CANCELLED -> PENDING
    public BookingResponse markPending(Authentication auth, Long bookingId) {
        User therapist = getUserFromAuth(auth);

        if (therapist.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Not allowed");
        }

        Booking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!b.getTherapistId().equals(therapist.getId())) {
            throw new RuntimeException("Not allowed");
        }

        if (b.getStatus() == BookingStatus.PENDING) {
            User booker = userRepository.findById(b.getUserId()).orElse(null);
            return toResponseForTherapistView(b, therapist, booker);
        }

        if (existsOtherActiveBookingForTherapistSlot(b.getId(), b.getTherapistId(), b.getDate(), b.getTime())) {
            throw new RuntimeException("Cannot mark pending because another booking already occupies this time slot.");
        }

        b.setStatus(BookingStatus.PENDING);

        // ✅ optional: keep message or clear it. I recommend clearing so old cancel reason doesn’t linger.
        b.setTherapistMessage(null);

        bookingRepository.save(b);

        User booker = userRepository.findById(b.getUserId()).orElse(null);
        return toResponseForTherapistView(b, therapist, booker);
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

        validateNotPast(newDate, newTime);

        if (!isValidTime(newTime)) {
            throw new RuntimeException("Invalid time. Allowed: 09:00 to 18:00 (30-min steps).");
        }

        ensureTherapistHasSlot(b.getTherapistId(), newDate, newTime);

        boolean sameAsCurrent = b.getDate().equals(newDate) && b.getTime().equals(newTime);

        if (!sameAsCurrent && existsActiveBookingForTherapistSlot(b.getTherapistId(), newDate, newTime)) {
            throw new RuntimeException("This time slot is already booked. Please choose another time.");
        }

        b.setDate(newDate);
        b.setTime(newTime);

        b.setStatus(BookingStatus.PENDING);

        // reschedule => clear old message
        b.setTherapistMessage(null);

        bookingRepository.save(b);

        User therapist = userRepository.findById(b.getTherapistId()).orElse(null);
        return toResponseForUserView(b, therapist);
    }

    public void cancel(Authentication auth, Long bookingId) {
        User me = getUserFromAuth(auth);

        Booking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!b.getUserId().equals(me.getId())) {
            throw new RuntimeException("Not allowed");
        }

        b.setStatus(BookingStatus.CANCELLED);

        // user-cancel => clear therapist message
        b.setTherapistMessage(null);

        bookingRepository.save(b);
    }

    // ---------------- helpers ----------------

    private boolean existsActiveBookingForTherapistSlot(Long therapistId, LocalDate date, String time) {
        List<Booking> list = bookingRepository.findAllByTherapistIdAndDateAndTime(therapistId, date, time);
        return list.stream().anyMatch(b -> b.getStatus() != BookingStatus.CANCELLED);
    }

    private boolean existsOtherActiveBookingForTherapistSlot(Long bookingId, Long therapistId, LocalDate date, String time) {
        List<Booking> list = bookingRepository.findAllByTherapistIdAndDateAndTime(therapistId, date, time);
        return list.stream().anyMatch(b -> !b.getId().equals(bookingId) && b.getStatus() != BookingStatus.CANCELLED);
    }

    private void ensureTherapistHasSlot(Long therapistId, LocalDate date, String time) {
        AvailabilityDay day = toAvailabilityDay(date);

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

        if (date.equals(today)) {
            try {
                LocalTime t = LocalTime.parse(time);
                LocalTime now = LocalTime.now();
                if (t.isBefore(now)) {
                    throw new RuntimeException("Please choose a future time.");
                }
            } catch (Exception ignored) {}
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

    private BookingResponse toResponseForUserView(Booking b, User therapist) {
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

        r.setUserId(b.getUserId());

        // ✅ NEW: expose therapist cancel message to user
        r.setTherapistMessage(b.getTherapistMessage());

        return r;
    }

    private BookingResponse toResponseForTherapistView(Booking b, User therapist, User booker) {
        BookingResponse r = new BookingResponse();
        r.setId(b.getId());
        r.setDate(b.getDate().toString());
        r.setTime(b.getTime());
        r.setStatus(b.getStatus().name());

        r.setTherapistId(b.getTherapistId());
        if (therapist != null) {
            String tName = (therapist.getFirstName() + " " + therapist.getLastName()).trim();
            r.setTherapistName(tName);
            r.setTherapistEmail(therapist.getUserEmail());
            r.setTherapistPhone(therapist.getPhoneNumber());
            r.setTherapistProfilePictureUrl(therapist.getProfilePictureUrl());
        }

        r.setUserId(b.getUserId());
        if (booker != null) {
            String uName = (booker.getFirstName() + " " + booker.getLastName()).trim();
            r.setUserName(uName);
            r.setUserEmail(booker.getUserEmail());
            r.setUserPhone(booker.getPhoneNumber());
            r.setUserProfilePictureUrl(booker.getProfilePictureUrl());
        } else {
            r.setUserName("User");
        }

        // ✅ NEW: include message in therapist view too
        r.setTherapistMessage(b.getTherapistMessage());

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
