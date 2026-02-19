package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.TherapistCardResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateTherapistSettingsRequest;
import com.ASD_Track_and_Care.backend.model.AvailabilityDay;
import com.ASD_Track_and_Care.backend.model.Booking;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.TherapistTimeSlot;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.BookingRepository;
import com.ASD_Track_and_Care.backend.repository.TherapistTimeSlotRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TherapistService {

    private final UserRepository userRepository;
    private final TherapistTimeSlotRepository timeSlotRepository;
    private final BookingRepository bookingRepository;

    public TherapistService(
            UserRepository userRepository,
            TherapistTimeSlotRepository timeSlotRepository,
            BookingRepository bookingRepository
    ) {
        this.userRepository = userRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.bookingRepository = bookingRepository;
    }

    public List<TherapistCardResponse> listTherapists() {
        List<User> therapists = userRepository.findAllByRole(Role.THERAPIST);

        return therapists.stream().map(u -> {
            String name = (u.getFirstName() + " " + u.getLastName()).trim();
            String qualification = (u.getQualification() == null || u.getQualification().isBlank())
                    ? "—" : u.getQualification();

            return new TherapistCardResponse(
                    u.getId(),
                    name,
                    qualification,
                    u.getPricePerSession(),
                    u.getProfilePictureUrl()
            );
        }).collect(Collectors.toList());
    }

    /**
     * ✅ Therapist saves price + time slots (day -> times)
     * Expected request body:
     * {
     *   "pricePerSession": 20,
     *   "availability": {
     *      "Sunday": ["09:00","09:30"],
     *      "Monday": ["10:00"]
     *   }
     * }
     */
    public User updateMyTherapistSettings(Authentication authentication, UpdateTherapistSettingsRequest req) {
        User me = requireAuth(authentication);

        if (me.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Only therapists can update therapist settings.");
        }

        if (req.getPricePerSession() == null || req.getPricePerSession().doubleValue() <= 0) {
            throw new RuntimeException("pricePerSession must be greater than 0.");
        }

        // ✅ DTO provides Map<String, List<String>>
        Map<AvailabilityDay, List<String>> normalized = normalizeAvailability(req.getAvailability());
        int totalSlots = normalized.values().stream().mapToInt(List::size).sum();
        if (totalSlots == 0) {
            throw new RuntimeException("Select at least one valid time slot.");
        }

        // Save price
        me.setPricePerSession(req.getPricePerSession());

        // Replace all existing slots
        timeSlotRepository.deleteAllByTherapistId(me.getId());

        List<TherapistTimeSlot> toSave = new ArrayList<>();
        Set<AvailabilityDay> daysWithAnySlots = new HashSet<>();

        for (Map.Entry<AvailabilityDay, List<String>> e : normalized.entrySet()) {
            AvailabilityDay day = e.getKey();
            List<String> times = e.getValue();

            for (String t : times) {
                toSave.add(new TherapistTimeSlot(me.getId(), day, t));
            }
            if (!times.isEmpty()) {
                daysWithAnySlots.add(day);
            }
        }

        timeSlotRepository.saveAll(toSave);

        // Keep User.availableDays synced (derived from slots)
        me.setAvailableDays(daysWithAnySlots);

        return userRepository.save(me);
    }

    /**
     * ✅ User picks a date -> return therapist slots for that weekday minus already booked times
     */
    public List<String> getAvailableSlotsForDate(Long therapistId, LocalDate date) {
        User t = userRepository.findById(therapistId)
                .orElseThrow(() -> new RuntimeException("Therapist not found"));

        if (t.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Selected user is not a therapist.");
        }

        AvailabilityDay day = toAvailabilityDay(date.getDayOfWeek());

        List<String> baseSlots = timeSlotRepository
                .findAllByTherapistIdAndDayOrderByTimeAsc(therapistId, day)
                .stream()
                .map(TherapistTimeSlot::getTime)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        if (baseSlots.isEmpty()) return List.of();

        // Remove already booked times
        List<Booking> bookings = bookingRepository.findAllByTherapistIdAndDate(therapistId, date);
        Set<String> bookedTimes = bookings.stream()
                .map(Booking::getTime)
                .filter(Objects::nonNull)
                .map(String::trim)
                .collect(Collectors.toSet());

        return baseSlots.stream()
                .filter(slot -> !bookedTimes.contains(slot))
                .collect(Collectors.toList());
    }

    // ---------------- helpers ----------------

    private User requireAuth(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * ✅ Converts Map<String, List<String>> (JSON keys)
     * -> Map<AvailabilityDay, List<String>> (strongly typed)
     */
    private Map<AvailabilityDay, List<String>> normalizeAvailability(Map<String, List<String>> in) {
        Map<AvailabilityDay, List<String>> out = new EnumMap<>(AvailabilityDay.class);
        if (in == null) return out;

        for (Map.Entry<String, List<String>> e : in.entrySet()) {
            String rawDay = e.getKey();
            if (rawDay == null || rawDay.isBlank()) continue;

            AvailabilityDay day = parseDay(rawDay.trim());
            if (day == null) continue;

            List<String> times = (e.getValue() == null) ? List.of() : e.getValue();

            List<String> cleaned = times.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .filter(this::isValidSlotTime)
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());

            if (!cleaned.isEmpty()) out.put(day, cleaned);
        }

        return out;
    }

    private AvailabilityDay parseDay(String s) {
        try {
            return AvailabilityDay.valueOf(s);
        } catch (Exception ignored) { }

        String k = s.toLowerCase();
        return switch (k) {
            case "sunday" -> AvailabilityDay.Sunday;
            case "monday" -> AvailabilityDay.Monday;
            case "tuesday" -> AvailabilityDay.Tuesday;
            case "wednesday" -> AvailabilityDay.Wednesday;
            case "thursday" -> AvailabilityDay.Thursday;
            case "friday" -> AvailabilityDay.Friday;
            case "saturday" -> AvailabilityDay.Saturday;
            default -> null;
        };
    }

    private AvailabilityDay toAvailabilityDay(DayOfWeek d) {
        return switch (d) {
            case SUNDAY -> AvailabilityDay.Sunday;
            case MONDAY -> AvailabilityDay.Monday;
            case TUESDAY -> AvailabilityDay.Tuesday;
            case WEDNESDAY -> AvailabilityDay.Wednesday;
            case THURSDAY -> AvailabilityDay.Thursday;
            case FRIDAY -> AvailabilityDay.Friday;
            case SATURDAY -> AvailabilityDay.Saturday;
        };
    }

    private boolean isValidSlotTime(String time) {
        // HH:mm, 09:00–18:00, step 30 min
        try {
            String[] p = time.split(":");
            if (p.length != 2) return false;

            int h = Integer.parseInt(p[0]);
            int m = Integer.parseInt(p[1]);

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
