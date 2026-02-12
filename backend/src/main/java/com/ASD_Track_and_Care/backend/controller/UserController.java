package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.ProfileResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateProfileRequest;
import com.ASD_Track_and_Care.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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

    // PUT /api/users/me
    @PutMapping("/me")
    public ResponseEntity<ProfileResponse> updateMe(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest req
    ) {
        return ResponseEntity.ok(userService.updateMyProfile(authentication, req));
    }
}
