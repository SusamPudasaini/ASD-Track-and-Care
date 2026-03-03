package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.service.ActivityReminderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reminders")
public class ActivityReminderController {

    private final ActivityReminderService activityReminderService;

    public ActivityReminderController(ActivityReminderService activityReminderService) {
        this.activityReminderService = activityReminderService;
    }

    @GetMapping("/activity")
    public ResponseEntity<?> getActivityReminder(Authentication authentication) {
        return ResponseEntity.ok(activityReminderService.getMyReminderStatus(authentication));
    }
}
