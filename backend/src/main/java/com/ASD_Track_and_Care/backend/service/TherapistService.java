package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.TherapistCardResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateTherapistSettingsRequest;
import com.ASD_Track_and_Care.backend.model.*;
import com.ASD_Track_and_Care.backend.repository.BookingRepository;
import com.ASD_Track_and_Care.backend.repository.TherapistReviewRepository;
import com.ASD_Track_and_Care.backend.repository.TherapistTimeSlotRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TherapistService {

    private final UserRepository userRepository;
    private final TherapistTimeSlotRepository timeSlotRepository;
    private final BookingRepository bookingRepository;
    private final TherapistReviewRepository therapistReviewRepository;

    public TherapistService(
            UserRepository userRepository,
            TherapistTimeSlotRepository timeSlotRepository,
            BookingRepository bookingRepository,
            TherapistReviewRepository therapistReviewRepository
    ) {
        this.userRepository = userRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.bookingRepository = bookingRepository;
        this.therapistReviewRepository = therapistReviewRepository;
    }

    public Map<String, Object> myReviewInsights(Authentication authentication) {
        User me = requireAuth(authentication);

        if (me.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Only therapists can view review insights.");
        }

        List<TherapistReview> reviews = therapistReviewRepository.findAllByTherapistIdOrderByCreatedAtDesc(me.getId());

        double avg = me.getAverageReview() == null ? 0.0 : me.getAverageReview();
        long total = me.getReviewCount() == null ? reviews.size() : me.getReviewCount();

        Map<String, Long> distribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            distribution.put(String.valueOf(i), therapistReviewRepository.countByTherapistIdAndRating(me.getId(), i));
        }

        Set<Long> bookingIds = reviews.stream().map(TherapistReview::getBookingId).collect(Collectors.toSet());
        Map<Long, Booking> bookingMap = bookingRepository.findAllById(bookingIds).stream()
                .collect(Collectors.toMap(Booking::getId, b -> b));

        Set<Long> userIds = reviews.stream().map(TherapistReview::getUserId).collect(Collectors.toSet());
        Map<Long, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<Map<String, Object>> recent = reviews.stream().limit(12).map(r -> {
            Booking b = bookingMap.get(r.getBookingId());
            User u = userMap.get(r.getUserId());

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", r.getId());
            row.put("rating", r.getRating());
            row.put("comment", r.getComment());
            row.put("createdAt", r.getCreatedAt());
            row.put("bookingId", r.getBookingId());
            row.put("sessionDate", b == null ? null : b.getDate());
            row.put("sessionTime", b == null ? null : b.getTime());
            row.put("reviewerName", u == null ? "Parent" : (u.getFirstName() + " " + u.getLastName()).trim());
            return row;
        }).toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("averageReview", Math.round(avg * 100.0) / 100.0);
        out.put("reviewCount", total);
        out.put("distribution", distribution);
        out.put("recentReviews", recent);
        return out;
    }

    public List<TherapistCardResponse> listTherapists() {
        List<User> therapists = userRepository.findAllByRole(Role.THERAPIST);

        return therapists.stream().map(this::toCardResponse).collect(Collectors.toList());
    }

    public TherapistCardResponse getTherapistById(Long therapistId) {
        User therapist = userRepository.findById(therapistId)
                .orElseThrow(() -> new RuntimeException("Therapist not found"));

        if (therapist.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Selected user is not a therapist.");
        }

        return toCardResponse(therapist);
    }

    @Transactional
    public User updateMyTherapistSettings(Authentication authentication, UpdateTherapistSettingsRequest req) {
        User me = requireAuth(authentication);

        if (me.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Only therapists can update therapist settings.");
        }

        if (req.getPricePerSession() == null || req.getPricePerSession().doubleValue() <= 0) {
            throw new RuntimeException("pricePerSession must be greater than 0.");
        }

        Map<AvailabilityDay, List<String>> normalized = normalizeAvailability(req.getAvailability());
        int totalSlots = normalized.values().stream().mapToInt(List::size).sum();

        me.setPricePerSession(req.getPricePerSession());

        if (req.getQualification() != null) {
            String qualification = req.getQualification().trim();
            me.setQualification(qualification.isEmpty() ? null : qualification);
        }

        if (req.getExperienceYears() != null) {
            me.setExperienceYears(req.getExperienceYears());
        }

        timeSlotRepository.deleteAllByTherapistId(me.getId());

        if (totalSlots > 0) {
            Set<String> seen = new HashSet<>();
            List<TherapistTimeSlot> toSave = new ArrayList<>();
            Set<AvailabilityDay> daysWithAnySlots = new HashSet<>();

            for (Map.Entry<AvailabilityDay, List<String>> e : normalized.entrySet()) {
                AvailabilityDay day = e.getKey();
                List<String> times = (e.getValue() == null) ? List.of() : e.getValue();

                for (String t : times) {
                    if (t == null) continue;
                    String time = t.trim();
                    if (time.isBlank()) continue;

                    String key = me.getId() + "|" + day.name() + "|" + time;
                    if (seen.add(key)) {
                        toSave.add(new TherapistTimeSlot(me.getId(), day, time));
                        daysWithAnySlots.add(day);
                    }
                }
            }

            if (!toSave.isEmpty()) {
                timeSlotRepository.saveAll(toSave);
            }

            me.setAvailableDays(daysWithAnySlots);
        } else {
            me.setAvailableDays(Collections.emptySet());
        }

        return userRepository.save(me);
    }

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

        List<Booking> bookings = bookingRepository.findAllByTherapistIdAndDate(therapistId, date);

        // ✅ IMPORTANT: only block slots if booking is NOT cancelled
        Set<String> bookedTimes = bookings.stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
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

            if (!cleaned.isEmpty()) {
                out.merge(day, cleaned, (a, b) -> {
                    Set<String> merged = new LinkedHashSet<>(a);
                    merged.addAll(b);
                    return merged.stream().sorted().collect(Collectors.toList());
                });
            }
        }

        return out;
    }

    private AvailabilityDay parseDay(String s) {
        try { return AvailabilityDay.valueOf(s); } catch (Exception ignored) {}
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

        private TherapistCardResponse toCardResponse(User u) {
        String name = (u.getFirstName() + " " + u.getLastName()).trim();
        String qualification = (u.getQualification() == null || u.getQualification().isBlank())
            ? "—" : u.getQualification();

        long slotCount = timeSlotRepository.countByTherapistId(u.getId());
        boolean available = slotCount > 0;

        List<Booking> bookings = bookingRepository.findAllByTherapistIdOrderByCreatedAtDesc(u.getId());
        long confirmedCount = bookings.stream().filter(b -> b.getStatus() == BookingStatus.CONFIRMED).count();

        int reviewCount = (u.getReviewCount() == null || u.getReviewCount() < 0)
            ? (int) confirmedCount
            : u.getReviewCount();

        double averageReview = (u.getAverageReview() == null || u.getAverageReview() <= 0)
            ? (reviewCount == 0 ? 0.0 : 4.0)
            : Math.max(0.0, Math.min(5.0, u.getAverageReview()));

        String publicAddress = (u.getWorkplaceAddress() == null || u.getWorkplaceAddress().isBlank())
            ? u.getAddress()
            : u.getWorkplaceAddress();

        return new TherapistCardResponse(
            u.getId(),
            name,
            qualification,
            u.getExperienceYears(),
            averageReview,
            reviewCount,
            publicAddress,
            u.getPricePerSession(),
            u.getProfilePictureUrl(),
            slotCount,
            available
        );
        }
}
