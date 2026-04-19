package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.ProfileResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateProfileRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateTherapistSettingsRequest;
import com.ASD_Track_and_Care.backend.model.AvailabilityDay;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.TherapistTimeSlot;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.TherapistTimeSlotRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final TherapistTimeSlotRepository therapistTimeSlotRepository;
    private final AddressGeocodingService addressGeocodingService;

    private static final String UPLOAD_DIR = "uploads/profile-pics";

    public UserService(
            UserRepository userRepository,
            TherapistTimeSlotRepository therapistTimeSlotRepository,
            AddressGeocodingService addressGeocodingService
    ) {
        this.userRepository = userRepository;
        this.therapistTimeSlotRepository = therapistTimeSlotRepository;
        this.addressGeocodingService = addressGeocodingService;
    }

    public ProfileResponse getMyProfile(Authentication authentication) {
        User user = getUserFromAuth(authentication);
        return toProfileResponse(user);
    }

    public ProfileResponse updateMyProfile(Authentication authentication, UpdateProfileRequest req) {
        User user = getUserFromAuth(authentication);

        user.setFirstName(req.getFirstName().trim());
        user.setLastName(req.getLastName().trim());
        user.setPhoneNumber(req.getPhoneNumber().trim());
        String address = req.getAddress().trim();
        user.setAddress(address);

        Double reqLat = req.getLatitude();
        Double reqLon = req.getLongitude();

        if (reqLat == null || reqLon == null) {
            throw new IllegalArgumentException("Location coordinates are required. Please pick a point on the map.");
        }

        if (!isValidLatLng(reqLat, reqLon)) {
            throw new IllegalArgumentException("Invalid latitude/longitude values.");
        }

        // Persist exact coordinates selected on the map.
        user.setLatitude(reqLat);
        user.setLongitude(reqLon);

        User saved = userRepository.saveAndFlush(user);
        User reloaded = userRepository.findById(saved.getId()).orElse(saved);
        return toProfileResponse(reloaded);
    }

    public ProfileResponse updateMyAvatar(Authentication authentication, MultipartFile file) {
        User user = getUserFromAuth(authentication);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only upload image file type.");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Image must be under 5MB.");
        }

        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));

            String original = Objects.requireNonNullElse(file.getOriginalFilename(), "avatar");
            String ext = "";

            int dot = original.lastIndexOf('.');
            if (dot >= 0) ext = original.substring(dot);

            String filename = UUID.randomUUID() + ext;
            Path target = Paths.get(UPLOAD_DIR).resolve(filename);

            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            String url = "/uploads/profile-pics/" + filename;
            user.setProfilePictureUrl(url);

            userRepository.save(user);
            return toProfileResponse(user);

        } catch (IOException e) {
            throw new RuntimeException("Failed to upload avatar.");
        }
    }

    /**
     * ✅ Therapist-only: price + day->times
     * Expects JSON:
     * {
     *   "pricePerSession": 20,
     *   "availability": {
     *      "Sunday": ["09:00","09:30"],
     *      "Monday": ["10:00"]
     *   }
     * }
     */
    public ProfileResponse updateTherapistSettings(Authentication authentication, UpdateTherapistSettingsRequest req) {
        User user = getUserFromAuth(authentication);

        if (user.getRole() != Role.THERAPIST) {
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
        user.setPricePerSession(req.getPricePerSession());

        // Overwrite therapist_time_slots
        therapistTimeSlotRepository.deleteAllByTherapistId(user.getId());

        List<TherapistTimeSlot> toSave = new ArrayList<>();
        Set<AvailabilityDay> daysWithAnySlots = new HashSet<>();

        for (Map.Entry<AvailabilityDay, List<String>> e : normalized.entrySet()) {
            AvailabilityDay day = e.getKey();
            List<String> times = e.getValue();

            for (String t : times) {
                toSave.add(new TherapistTimeSlot(user.getId(), day, t));
            }
            if (!times.isEmpty()) daysWithAnySlots.add(day);
        }

        therapistTimeSlotRepository.saveAll(toSave);

        // keep user_available_days synced (optional but useful)
        user.setAvailableDays(daysWithAnySlots);

        userRepository.save(user);

        return toProfileResponse(user);
    }

    private User getUserFromAuth(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private boolean isValidLatLng(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) return false;
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)) return false;
        return latitude >= -90.0 && latitude <= 90.0 && longitude >= -180.0 && longitude <= 180.0;
    }

    private ProfileResponse toProfileResponse(User user) {
        ProfileResponse res = new ProfileResponse();
        res.setUsername(user.getUsername());
        res.setUserEmail(user.getUserEmail());
        res.setFirstName(user.getFirstName());
        res.setLastName(user.getLastName());
        res.setPhoneNumber(user.getPhoneNumber());
        res.setAddress(user.getAddress());
        res.setLatitude(user.getLatitude());
        res.setLongitude(user.getLongitude());
        res.setWorkplaceAddress(user.getWorkplaceAddress());
        res.setWorkplaceLatitude(user.getWorkplaceLatitude());
        res.setWorkplaceLongitude(user.getWorkplaceLongitude());
        res.setRole(user.getRole());
        res.setProfilePictureUrl(user.getProfilePictureUrl());

        if (user.getRole() == Role.THERAPIST) {
            res.setPricePerSession(user.getPricePerSession());
            res.setQualification(user.getQualification());
            res.setExperienceYears(user.getExperienceYears());
            res.setAverageReview(user.getAverageReview() == null ? 0.0 : user.getAverageReview());
            res.setReviewCount(user.getReviewCount() == null ? 0 : user.getReviewCount());

            // availability map from therapist_time_slots
            List<TherapistTimeSlot> slots = therapistTimeSlotRepository.findAllByTherapistId(user.getId());
            Map<AvailabilityDay, List<String>> map = new EnumMap<>(AvailabilityDay.class);

            for (TherapistTimeSlot s : slots) {
                if (s.getDay() == null || s.getTime() == null) continue;
                map.computeIfAbsent(s.getDay(), k -> new ArrayList<>()).add(s.getTime().trim());
            }

            // unique + sort
            for (Map.Entry<AvailabilityDay, List<String>> e : map.entrySet()) {
                List<String> cleaned = e.getValue().stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(v -> !v.isBlank())
                        .distinct()
                        .sorted()
                        .collect(Collectors.toList());
                e.setValue(cleaned);
            }

            res.setAvailability(map);
        } else {
            res.setPricePerSession(null);
            res.setQualification(null);
            res.setExperienceYears(null);
            res.setAverageReview(null);
            res.setReviewCount(null);
            res.setAvailability(null);
        }

        return res;
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

            if (!cleaned.isEmpty()) {
                out.put(day, cleaned);
            }
        }

        return out;
    }

    private AvailabilityDay parseDay(String s) {
        // Supports: "Sunday" (exact enum), or case-insensitive day
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
