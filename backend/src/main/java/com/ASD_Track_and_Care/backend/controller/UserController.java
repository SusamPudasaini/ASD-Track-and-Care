package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.ProfileResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateProfileRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateTherapistSettingsRequest;
import com.ASD_Track_and_Care.backend.service.TherapistService;
import com.ASD_Track_and_Care.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final TherapistService therapistService;

    public UserController(UserService userService, TherapistService therapistService) {
        this.userService = userService;
        this.therapistService = therapistService;
    }

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMe(Authentication authentication) {
        return ResponseEntity.ok(userService.getMyProfile(authentication));
    }

    @PutMapping("/me")
    public ResponseEntity<ProfileResponse> updateMe(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest req
    ) {
        return ResponseEntity.ok(userService.updateMyProfile(authentication, req));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProfileResponse> uploadAvatar(
            Authentication authentication,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.ok(userService.updateMyAvatar(authentication, file));
    }

    /**
     * ✅ Therapist: price + availability (day -> times)
     * PUT /api/users/me/therapist-settings
     * Body:
     * {
     *   "pricePerSession": 20,
     *   "availability": { "Sunday": ["09:00","09:30"] }
     * }
     */
    @PutMapping("/me/therapist-settings")
    public ResponseEntity<ProfileResponse> updateTherapistSettings(
            Authentication authentication,
            @Valid @RequestBody UpdateTherapistSettingsRequest req
    ) {
        // Update therapist slots + price
        therapistService.updateMyTherapistSettings(authentication, req);

        // Return fresh profile (includes price + availability)
        return ResponseEntity.ok(userService.getMyProfile(authentication));
    }
}
