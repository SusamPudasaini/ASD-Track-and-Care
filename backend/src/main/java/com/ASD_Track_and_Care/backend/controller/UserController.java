package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.ProfileResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateProfileRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateTherapistSettingsRequest;
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

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // GET /api/users/me
    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMe(Authentication authentication) {
        return ResponseEntity.ok(userService.getMyProfile(authentication));
    }

    // PUT /api/users/me (basic profile: first/last/phone)
    @PutMapping("/me")
    public ResponseEntity<ProfileResponse> updateMe(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest req
    ) {
        return ResponseEntity.ok(userService.updateMyProfile(authentication, req));
    }

    // ✅ Everyone can change profile picture
    // POST /api/users/me/avatar (multipart/form-data file=<image>)
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProfileResponse> uploadAvatar(
            Authentication authentication,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.ok(userService.updateMyAvatar(authentication, file));
    }

    // ✅ Only THERAPIST can change price + available days
    // PUT /api/users/me/therapist-settings
    @PutMapping("/me/therapist-settings")
    public ResponseEntity<ProfileResponse> updateTherapistSettings(
            Authentication authentication,
            @Valid @RequestBody UpdateTherapistSettingsRequest req
    ) {
        return ResponseEntity.ok(userService.updateTherapistSettings(authentication, req));
    }
}
