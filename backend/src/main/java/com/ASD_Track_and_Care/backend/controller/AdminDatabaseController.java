package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.model.Booking;
import com.ASD_Track_and_Care.backend.model.BookingStatus;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.TherapistReview;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.AacFavoritePhraseRepository;
import com.ASD_Track_and_Care.backend.repository.BookingRepository;
import com.ASD_Track_and_Care.backend.repository.BookingChatMessageRepository;
import com.ASD_Track_and_Care.backend.repository.DayCareUserReviewRepository;
import com.ASD_Track_and_Care.backend.repository.FirstThenBoardRepository;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireAnswerRepository;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireSubmissionRepository;
import com.ASD_Track_and_Care.backend.repository.QuestionnaireRecordRepository;
import com.ASD_Track_and_Care.backend.repository.TherapistReviewRepository;
import com.ASD_Track_and_Care.backend.repository.TherapistTimeSlotRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/database")
public class AdminDatabaseController {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final TherapistReviewRepository therapistReviewRepository;
    private final QuestionnaireRecordRepository questionnaireRecordRepository;
    private final MChatQuestionnaireSubmissionRepository mChatQuestionnaireSubmissionRepository;
    private final MChatQuestionnaireAnswerRepository mChatQuestionnaireAnswerRepository;
    private final AacFavoritePhraseRepository aacFavoritePhraseRepository;
    private final FirstThenBoardRepository firstThenBoardRepository;
    private final DayCareUserReviewRepository dayCareUserReviewRepository;
    private final BookingChatMessageRepository bookingChatMessageRepository;
    private final TherapistTimeSlotRepository therapistTimeSlotRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminDatabaseController(
            UserRepository userRepository,
            BookingRepository bookingRepository,
            TherapistReviewRepository therapistReviewRepository,
            QuestionnaireRecordRepository questionnaireRecordRepository,
            MChatQuestionnaireSubmissionRepository mChatQuestionnaireSubmissionRepository,
            MChatQuestionnaireAnswerRepository mChatQuestionnaireAnswerRepository,
            AacFavoritePhraseRepository aacFavoritePhraseRepository,
            FirstThenBoardRepository firstThenBoardRepository,
            DayCareUserReviewRepository dayCareUserReviewRepository,
            BookingChatMessageRepository bookingChatMessageRepository,
            TherapistTimeSlotRepository therapistTimeSlotRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.therapistReviewRepository = therapistReviewRepository;
        this.questionnaireRecordRepository = questionnaireRecordRepository;
        this.mChatQuestionnaireSubmissionRepository = mChatQuestionnaireSubmissionRepository;
        this.mChatQuestionnaireAnswerRepository = mChatQuestionnaireAnswerRepository;
        this.aacFavoritePhraseRepository = aacFavoritePhraseRepository;
        this.firstThenBoardRepository = firstThenBoardRepository;
        this.dayCareUserReviewRepository = dayCareUserReviewRepository;
        this.bookingChatMessageRepository = bookingChatMessageRepository;
        this.therapistTimeSlotRepository = therapistTimeSlotRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> users(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "emailVerified", required = false) String emailVerified
    ) {
        String query = safeLower(q);
        Role roleFilter = parseRole(role);
        Boolean emailVerifiedFilter = parseBooleanFilter(emailVerified);

        List<Map<String, Object>> out = userRepository.findAll().stream()
                .filter(u -> roleFilter == null || u.getRole() == roleFilter)
            .filter(u -> emailVerifiedFilter == null || u.isEmailVerified() == emailVerifiedFilter)
                .filter(u -> {
                    if (query.isBlank()) return true;
                    return containsAny(query,
                            u.getUsername(),
                            u.getUserEmail(),
                            u.getFirstName(),
                            u.getLastName(),
                            u.getPhoneNumber(),
                    u.isEmailVerified() ? "verified" : "not verified",
                            u.getRole() == null ? null : u.getRole().name());
                })
                .sorted(Comparator.comparing(User::getId, Comparator.nullsLast(Long::compareTo)).reversed())
                .map(this::toUserRow)
                .collect(Collectors.toCollection(ArrayList::new));

        return ResponseEntity.ok(out);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> body) {
        String firstName = clean(asText(body == null ? null : body.get("firstName")));
        String lastName = clean(asText(body == null ? null : body.get("lastName")));
        String username = clean(asText(body == null ? null : body.get("username")));
        String email = clean(asText(body == null ? null : body.get("email"))).toLowerCase(Locale.ROOT);
        String phone = clean(asText(body == null ? null : body.get("phone")));
        String password = clean(asText(body == null ? null : body.get("password")));
        Role role = parseRole(asText(body == null ? null : body.get("role")));

        if (firstName.isBlank() || lastName.isBlank() || username.isBlank() || email.isBlank() || phone.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "firstName, lastName, username, email, phone and password are required."));
        }

        if (password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 6 characters."));
        }

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists."));
        }

        if (userRepository.existsByUserEmailIgnoreCase(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists."));
        }

        if (userRepository.existsByPhoneNumber(phone)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone number already exists."));
        }

        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setUsername(username);
        user.setUserEmail(email);
        user.setPhoneNumber(phone);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role == null ? Role.USER : role);
        user.setEmailVerified(true);

        User saved = userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "username", saved.getUsername(),
                "email", saved.getUserEmail(),
                "role", saved.getRole().name(),
                "message", "User created"
        ));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String firstName = clean(asText(body == null ? null : body.get("firstName")));
        String lastName = clean(asText(body == null ? null : body.get("lastName")));
        String username = clean(asText(body == null ? null : body.get("username")));
        String email = clean(asText(body == null ? null : body.get("email"))).toLowerCase(Locale.ROOT);
        String phone = clean(asText(body == null ? null : body.get("phone")));
        String address = clean(asText(body == null ? null : body.get("address")));
        String workplaceAddress = clean(asText(body == null ? null : body.get("workplaceAddress")));
        String qualification = clean(asText(body == null ? null : body.get("qualification")));
        Integer experienceYears = parseInteger(body == null ? null : body.get("experienceYears"));
        Boolean emailVerified = parseBooleanBody(body == null ? null : body.get("emailVerified"));
        Role role = parseRole(asText(body == null ? null : body.get("role")));
        String password = clean(asText(body == null ? null : body.get("password")));

        if (firstName.isBlank() || lastName.isBlank() || username.isBlank() || email.isBlank() || phone.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "firstName, lastName, username, email, and phone are required."));
        }

        boolean usernameTaken = userRepository.findByUsername(username)
                .filter(other -> !other.getId().equals(id))
                .isPresent();
        if (usernameTaken) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists."));
        }

        boolean emailTaken = userRepository.findByUserEmailIgnoreCase(email)
                .filter(other -> !other.getId().equals(id))
                .isPresent();
        if (emailTaken) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists."));
        }

        boolean phoneTaken = userRepository.findByPhoneNumber(phone)
                .filter(other -> !other.getId().equals(id))
                .isPresent();
        if (phoneTaken) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone number already exists."));
        }

        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setUsername(username);
        user.setUserEmail(email);
        user.setPhoneNumber(phone);
        user.setAddress(address.isBlank() ? null : address);
        user.setWorkplaceAddress(workplaceAddress.isBlank() ? null : workplaceAddress);
        user.setQualification(qualification.isBlank() ? null : qualification);
        user.setExperienceYears(experienceYears);
        if (body != null && body.containsKey("emailVerified")) {
            if (emailVerified == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "emailVerified must be true or false"));
            }
            user.setEmailVerified(emailVerified);
        }
        if (role != null) {
            user.setRole(role);
        }

        if (!password.isBlank()) {
            if (password.length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 6 characters."));
            }
            user.setPassword(passwordEncoder.encode(password));
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "message", "User updated"
        ));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String rawRole = body == null ? null : asText(body.get("role"));
        Role newRole = parseRole(rawRole);
        if (newRole == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid role"));
        }

        user.setRole(newRole);
        User saved = userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "role", saved.getRole().name(),
                "message", "Role updated"
        ));
    }

        @PutMapping("/users/{id}/email-verified")
        public ResponseEntity<?> updateUserEmailVerified(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body
        ) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Boolean emailVerified = parseBooleanBody(body == null ? null : body.get("emailVerified"));
        if (emailVerified == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "emailVerified must be true or false"));
        }

        user.setEmailVerified(emailVerified);
        User saved = userRepository.save(user);

        return ResponseEntity.ok(Map.of(
            "id", saved.getId(),
            "emailVerified", saved.isEmailVerified(),
            "message", "Email verification status updated"
        ));
        }

        @Transactional
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable("id") Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of("message", "Admin users cannot be deleted from this panel."));
        }

        try {
            List<Booking> linkedBookings = bookingRepository.findAllByUserIdOrTherapistId(id, id);
            List<Long> linkedBookingIds = linkedBookings.stream().map(Booking::getId).collect(Collectors.toList());

            if (!linkedBookingIds.isEmpty()) {
                therapistReviewRepository.deleteAllByBookingIdIn(linkedBookingIds);
                bookingChatMessageRepository.deleteAllByBookingIdIn(linkedBookingIds);
            }

            therapistReviewRepository.deleteAllByUserIdOrTherapistId(id, id);
            bookingRepository.deleteAllByUserIdOrTherapistId(id, id);
            therapistTimeSlotRepository.deleteAllByTherapistId(id);

            mChatQuestionnaireAnswerRepository.deleteAllBySubmission_User_Id(id);
            mChatQuestionnaireSubmissionRepository.deleteAllByUser_Id(id);
            questionnaireRecordRepository.deleteAllByUser_Id(id);
            dayCareUserReviewRepository.deleteAllByUser_Id(id);
            firstThenBoardRepository.deleteAllByUser_Id(id);
            aacFavoritePhraseRepository.deleteAllByUser_Id(id);

            userRepository.delete(user);
            return ResponseEntity.ok(Map.of("id", id, "message", "User deleted"));
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot delete user with linked records."));
        }
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<Map<String, Object>>> bookings(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "status", required = false) String status
    ) {
        String query = safeLower(q);
        BookingStatus statusFilter = parseBookingStatus(status);

        List<Booking> records = bookingRepository.findAll();
        Map<Long, User> userMap = loadUserMap(records.stream()
                .flatMap(b -> java.util.stream.Stream.of(b.getUserId(), b.getTherapistId()))
                .collect(Collectors.toSet()));

        List<Map<String, Object>> out = records.stream()
                .filter(b -> statusFilter == null || b.getStatus() == statusFilter)
                .filter(b -> {
                    if (query.isBlank()) return true;
                    User booker = userMap.get(b.getUserId());
                    User therapist = userMap.get(b.getTherapistId());
                    return containsAny(query,
                            b.getId(),
                            b.getStatus() == null ? null : b.getStatus().name(),
                            b.getDate(),
                            b.getTime(),
                            b.getPaymentStatus(),
                            booker == null ? null : booker.getUsername(),
                            booker == null ? null : booker.getUserEmail(),
                            therapist == null ? null : therapist.getUsername(),
                            therapist == null ? null : therapist.getUserEmail());
                })
                .sorted(Comparator.comparing(Booking::getCreatedAt, Comparator.nullsLast(java.time.LocalDateTime::compareTo)).reversed())
                .map(b -> toBookingRow(b, userMap.get(b.getUserId()), userMap.get(b.getTherapistId())))
                .collect(Collectors.toCollection(ArrayList::new));

        return ResponseEntity.ok(out);
    }

    @PutMapping("/bookings/{id}/status")
    public ResponseEntity<?> updateBookingStatus(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body
    ) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        String rawStatus = body == null ? null : asText(body.get("status"));
        BookingStatus newStatus = parseBookingStatus(rawStatus);
        if (newStatus == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid booking status"));
        }

        booking.setStatus(newStatus);
        Booking saved = bookingRepository.save(booking);

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "status", saved.getStatus().name(),
                "message", "Booking status updated"
        ));
    }

        @PutMapping("/bookings/{id}")
        public ResponseEntity<?> updateBooking(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body
        ) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Booking not found"));

        Long userId = parseLong(body == null ? null : body.get("userId"));
        Long therapistId = parseLong(body == null ? null : body.get("therapistId"));
        LocalDate date = parseLocalDate(body == null ? null : body.get("date"));
        String time = clean(asText(body == null ? null : body.get("time")));
        BookingStatus status = parseBookingStatus(asText(body == null ? null : body.get("status")));
        String paymentStatus = clean(asText(body == null ? null : body.get("paymentStatus")));
        BigDecimal amount = parseBigDecimal(body == null ? null : body.get("amount"));
        String therapistMessage = clean(asText(body == null ? null : body.get("therapistMessage")));

        if (userId == null || therapistId == null || date == null || time.isBlank() || status == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId, therapistId, date, time, and status are required."));
        }

        booking.setUserId(userId);
        booking.setTherapistId(therapistId);
        booking.setDate(date);
        booking.setTime(time);
        booking.setStatus(status);
        booking.setPaymentStatus(paymentStatus.isBlank() ? null : paymentStatus);
        booking.setAmount(amount);
        booking.setTherapistMessage(therapistMessage.isBlank() ? null : therapistMessage);

        Booking saved = bookingRepository.save(booking);
        return ResponseEntity.ok(Map.of(
            "id", saved.getId(),
            "message", "Booking updated"
        ));
        }

    @DeleteMapping("/bookings/{id}")
    public ResponseEntity<?> deleteBooking(@PathVariable("id") Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (therapistReviewRepository.existsByBookingId(id)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot delete booking with linked review."));
        }

        bookingRepository.delete(booking);
        return ResponseEntity.ok(Map.of("id", id, "message", "Booking deleted"));
    }

    @GetMapping("/therapist-reviews")
    public ResponseEntity<List<Map<String, Object>>> therapistReviews(
            @RequestParam(value = "q", required = false) String q
    ) {
        String query = safeLower(q);
        List<TherapistReview> reviews = therapistReviewRepository.findAll();

        Set<Long> ids = reviews.stream()
                .flatMap(r -> java.util.stream.Stream.of(r.getUserId(), r.getTherapistId()))
                .collect(Collectors.toSet());
        Map<Long, User> userMap = loadUserMap(ids);

        List<Map<String, Object>> out = reviews.stream()
                .filter(r -> {
                    if (query.isBlank()) return true;
                    User reviewer = userMap.get(r.getUserId());
                    User therapist = userMap.get(r.getTherapistId());
                    return containsAny(query,
                            r.getId(),
                            r.getBookingId(),
                            r.getRating(),
                            r.getComment(),
                            reviewer == null ? null : reviewer.getUsername(),
                            therapist == null ? null : therapist.getUsername());
                })
                .sorted(Comparator.comparing(TherapistReview::getCreatedAt, Comparator.nullsLast(java.time.Instant::compareTo)).reversed())
                .map(r -> {
                    User reviewer = userMap.get(r.getUserId());
                    User therapist = userMap.get(r.getTherapistId());
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", r.getId());
                    row.put("bookingId", r.getBookingId());
                    row.put("rating", r.getRating());
                    row.put("comment", r.getComment());
                    row.put("createdAt", r.getCreatedAt() == null ? null : r.getCreatedAt().toString());
                    row.put("userId", r.getUserId());
                    row.put("userUsername", reviewer == null ? null : reviewer.getUsername());
                    row.put("therapistId", r.getTherapistId());
                    row.put("therapistUsername", therapist == null ? null : therapist.getUsername());
                    return row;
                })
                .collect(Collectors.toCollection(ArrayList::new));

        return ResponseEntity.ok(out);
    }

    @PutMapping("/therapist-reviews/{id}")
    public ResponseEntity<?> updateTherapistReview(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body
    ) {
        TherapistReview review = therapistReviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Therapist review not found"));

        Long bookingId = parseLong(body == null ? null : body.get("bookingId"));
        Long userId = parseLong(body == null ? null : body.get("userId"));
        Long therapistId = parseLong(body == null ? null : body.get("therapistId"));
        Integer rating = parseInteger(body == null ? null : body.get("rating"));
        String comment = clean(asText(body == null ? null : body.get("comment")));

        if (bookingId == null || userId == null || therapistId == null || rating == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "bookingId, userId, therapistId, and rating are required."));
        }

        if (rating < 1 || rating > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rating must be between 1 and 5."));
        }

        review.setBookingId(bookingId);
        review.setUserId(userId);
        review.setTherapistId(therapistId);
        review.setRating(rating);
        review.setComment(comment.isBlank() ? null : comment);

        TherapistReview saved = therapistReviewRepository.save(review);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "message", "Therapist review updated"
        ));
    }

    @DeleteMapping("/therapist-reviews/{id}")
    public ResponseEntity<?> deleteTherapistReview(@PathVariable("id") Long id) {
        TherapistReview review = therapistReviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Therapist review not found"));

        therapistReviewRepository.delete(review);
        return ResponseEntity.ok(Map.of("id", id, "message", "Therapist review deleted"));
    }

    private Map<Long, User> loadUserMap(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(User::getId, u -> u));
    }

    private Map<String, Object> toUserRow(User u) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", u.getId());
        row.put("username", u.getUsername());
        row.put("email", u.getUserEmail());
        row.put("firstName", u.getFirstName());
        row.put("lastName", u.getLastName());
        row.put("phone", u.getPhoneNumber());
        row.put("role", u.getRole() == null ? null : u.getRole().name());
        row.put("emailVerified", u.isEmailVerified());
        row.put("address", u.getAddress());
        row.put("workplaceAddress", u.getWorkplaceAddress());
        row.put("availableDays", u.getAvailableDays() == null
                ? List.of()
                : u.getAvailableDays().stream().map(Enum::name).sorted().collect(Collectors.toList()));
        row.put("averageReview", u.getAverageReview());
        row.put("reviewCount", u.getReviewCount());
        row.put("profilePictureUrl", u.getProfilePictureUrl());
        return row;
    }

    private Map<String, Object> toBookingRow(Booking b, User booker, User therapist) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", b.getId());
        row.put("userId", b.getUserId());
        row.put("userUsername", booker == null ? null : booker.getUsername());
        row.put("userEmail", booker == null ? null : booker.getUserEmail());
        row.put("therapistId", b.getTherapistId());
        row.put("therapistUsername", therapist == null ? null : therapist.getUsername());
        row.put("therapistEmail", therapist == null ? null : therapist.getUserEmail());
        row.put("date", b.getDate() == null ? null : b.getDate().toString());
        row.put("time", b.getTime());
        row.put("status", b.getStatus() == null ? null : b.getStatus().name());
        row.put("paymentStatus", b.getPaymentStatus());
        row.put("amount", b.getAmount());
        row.put("createdAt", b.getCreatedAt() == null ? null : b.getCreatedAt().toString());
        row.put("therapistMessage", b.getTherapistMessage());
        return row;
    }

    private boolean containsAny(String needleLower, Object... values) {
        if (needleLower == null || needleLower.isBlank()) return true;
        for (Object value : values) {
            if (value == null) continue;
            String candidate = String.valueOf(value).toLowerCase(Locale.ROOT);
            if (candidate.contains(needleLower)) return true;
        }
        return false;
    }

    private String safeLower(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String asText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private Long parseLong(Object value) {
        if (value == null) return null;
        try {
            String s = String.valueOf(value).trim();
            if (s.isBlank()) return null;
            return Long.parseLong(s);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Integer parseInteger(Object value) {
        if (value == null) return null;
        try {
            String s = String.valueOf(value).trim();
            if (s.isBlank()) return null;
            return Integer.parseInt(s);
        } catch (Exception ignored) {
            return null;
        }
    }

    private BigDecimal parseBigDecimal(Object value) {
        if (value == null) return null;
        try {
            String s = String.valueOf(value).trim();
            if (s.isBlank()) return null;
            return new BigDecimal(s);
        } catch (Exception ignored) {
            return null;
        }
    }

    private LocalDate parseLocalDate(Object value) {
        if (value == null) return null;
        try {
            String s = String.valueOf(value).trim();
            if (s.isBlank()) return null;
            return LocalDate.parse(s);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Role parseRole(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Role.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ignored) {
            return null;
        }
    }

    private BookingStatus parseBookingStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return BookingStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ignored) {
            return null;
        }
    }

    private Boolean parseBooleanFilter(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.trim().toLowerCase(Locale.ROOT);
        if ("true".equals(v) || "1".equals(v) || "verified".equals(v)) return true;
        if ("false".equals(v) || "0".equals(v) || "not_verified".equals(v) || "not-verified".equals(v) || "unverified".equals(v)) {
            return false;
        }
        return null;
    }

    private Boolean parseBooleanBody(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b;
        String v = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
        if ("true".equals(v) || "1".equals(v)) return true;
        if ("false".equals(v) || "0".equals(v)) return false;
        return null;
    }
}
