package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.CreateDayCareGoogleReviewRequest;
import com.ASD_Track_and_Care.backend.dto.CreateDayCareUserReviewRequest;
import com.ASD_Track_and_Care.backend.dto.DayCareGoogleReviewResponse;
import com.ASD_Track_and_Care.backend.dto.DayCareUserReviewResponse;
import com.ASD_Track_and_Care.backend.model.DayCareCenter;
import com.ASD_Track_and_Care.backend.model.DayCareGoogleReview;
import com.ASD_Track_and_Care.backend.model.DayCareUserReview;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.DayCareCenterRepository;
import com.ASD_Track_and_Care.backend.repository.DayCareGoogleReviewRepository;
import com.ASD_Track_and_Care.backend.repository.DayCareUserReviewRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DayCareReviewService {

    private final DayCareCenterRepository dayCareCenterRepository;
    private final DayCareUserReviewRepository dayCareUserReviewRepository;
    private final DayCareGoogleReviewRepository dayCareGoogleReviewRepository;
    private final UserRepository userRepository;

    public DayCareReviewService(
            DayCareCenterRepository dayCareCenterRepository,
            DayCareUserReviewRepository dayCareUserReviewRepository,
            DayCareGoogleReviewRepository dayCareGoogleReviewRepository,
            UserRepository userRepository
    ) {
        this.dayCareCenterRepository = dayCareCenterRepository;
        this.dayCareUserReviewRepository = dayCareUserReviewRepository;
        this.dayCareGoogleReviewRepository = dayCareGoogleReviewRepository;
        this.userRepository = userRepository;
    }

    public List<DayCareUserReviewResponse> listUserReviews(Long dayCareId, Authentication authentication) {
        DayCareCenter center = requireCenter(dayCareId);
        User me = getOptionalUser(authentication);

        return dayCareUserReviewRepository.findAllByDayCareCenterOrderByCreatedAtDesc(center)
                .stream()
                .map(r -> toUserReviewDto(r, me))
                .toList();
    }

    public DayCareUserReviewResponse createOrUpdateUserReview(
            Long dayCareId,
            Authentication authentication,
            CreateDayCareUserReviewRequest req
    ) {
        User user = requireUser(authentication);
        DayCareCenter center = requireCenter(dayCareId);

        DayCareUserReview review = dayCareUserReviewRepository.findByDayCareCenterAndUser(center, user)
                .orElseGet(DayCareUserReview::new);

        review.setDayCareCenter(center);
        review.setUser(user);
        review.setRating(req.getRating());
        review.setComment(req.getComment().trim());

        dayCareUserReviewRepository.save(review);
        recalculatePlatformRating(center);

        return toUserReviewDto(review, user);
    }

    public List<DayCareGoogleReviewResponse> listGoogleReviews(Long dayCareId) {
        DayCareCenter center = requireCenter(dayCareId);
        return dayCareGoogleReviewRepository.findAllByDayCareCenterOrderByCreatedAtDesc(center)
                .stream()
                .map(this::toGoogleReviewDto)
                .toList();
    }

    public DayCareGoogleReviewResponse addGoogleReviewSnapshot(
            Long dayCareId,
            CreateDayCareGoogleReviewRequest req
    ) {
        DayCareCenter center = requireCenter(dayCareId);

        DayCareGoogleReview review = new DayCareGoogleReview();
        review.setDayCareCenter(center);
        review.setAuthorName(req.getAuthorName().trim());
        review.setRating(req.getRating());
        review.setComment(req.getComment().trim());
        review.setRelativeTimeText(req.getRelativeTimeText());

        dayCareGoogleReviewRepository.save(review);
        return toGoogleReviewDto(review);
    }

    private void recalculatePlatformRating(DayCareCenter center) {
        List<DayCareUserReview> reviews = dayCareUserReviewRepository.findAllByDayCareCenterOrderByCreatedAtDesc(center);

        if (reviews.isEmpty()) {
            center.setAverageRating(0.0);
            center.setTotalReviews(0);
        } else {
            double avg = reviews.stream()
                    .mapToInt(DayCareUserReview::getRating)
                    .average()
                    .orElse(0.0);

            center.setAverageRating(Math.round(avg * 10.0) / 10.0);
            center.setTotalReviews(reviews.size());
        }

        dayCareCenterRepository.save(center);
    }

    private DayCareCenter requireCenter(Long id) {
        return dayCareCenterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Day care center not found"));
    }

    private User requireUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }

        String name = auth.getName();
        return userRepository.findByUsername(name)
                .or(() -> userRepository.findByUserEmail(name))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private User getOptionalUser(Authentication auth) {
        try {
            return requireUser(auth);
        } catch (Exception e) {
            return null;
        }
    }

    private DayCareUserReviewResponse toUserReviewDto(DayCareUserReview r, User me) {
        DayCareUserReviewResponse dto = new DayCareUserReviewResponse();
        dto.setId(r.getId());
        dto.setUserId(r.getUser().getId());
        dto.setUsername(r.getUser().getUsername());
        dto.setRating(r.getRating());
        dto.setComment(r.getComment());
        dto.setCreatedAt(r.getCreatedAt());
        dto.setUpdatedAt(r.getUpdatedAt());
        dto.setMine(me != null && me.getId().equals(r.getUser().getId()));
        return dto;
    }

    private DayCareGoogleReviewResponse toGoogleReviewDto(DayCareGoogleReview r) {
        DayCareGoogleReviewResponse dto = new DayCareGoogleReviewResponse();
        dto.setId(r.getId());
        dto.setAuthorName(r.getAuthorName());
        dto.setRating(r.getRating());
        dto.setComment(r.getComment());
        dto.setRelativeTimeText(r.getRelativeTimeText());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}