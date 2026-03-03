package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.model.ActivityResult;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.ActivityResultRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ActivityReminderService {

    private final ActivityResultRepository activityResultRepository;
    private final UserRepository userRepository;

    public ActivityReminderService(ActivityResultRepository activityResultRepository, UserRepository userRepository) {
        this.activityResultRepository = activityResultRepository;
        this.userRepository = userRepository;
    }

    public Map<String, Object> getMyReminderStatus(Authentication authentication) {
        User user = requireUser(authentication);

        List<ActivityResult> latest = activityResultRepository
                .findByUsernameOrderByCreatedAtDesc(user.getUsername(), PageRequest.of(0, 365));

        Set<LocalDate> activeDays = latest.stream()
                .map(ActivityResult::getCreatedAt)
                .map(this::toLocalDate)
                .collect(Collectors.toSet());

        LocalDate today = LocalDate.now();
        int streak = 0;

        LocalDate cursor = today;
        if (!activeDays.contains(today)) {
            cursor = today.minusDays(1);
        }

        while (activeDays.contains(cursor)) {
            streak += 1;
            cursor = cursor.minusDays(1);
        }

        LocalDate lastActiveDay = latest.isEmpty() ? null : toLocalDate(latest.get(0).getCreatedAt());
        long inactiveDays = lastActiveDay == null ? 999 : ChronoUnit.DAYS.between(lastActiveDay, today);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("streakDays", streak);
        out.put("inactiveDays", Math.max(inactiveDays, 0));
        out.put("shouldAlert", inactiveDays >= 3);
        out.put("message", inactiveDays >= 3
                ? "You have not completed activities for a few days. Please resume today."
                : "Great consistency. Keep your routine active.");
        out.put("lastActivityDate", lastActiveDay == null ? null : lastActiveDay.toString());

        return out;
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

    private LocalDate toLocalDate(Instant instant) {
        return instant.atZone(ZoneId.systemDefault()).toLocalDate();
    }
}
