package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.ProfileResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateProfileRequest;
import com.ASD_Track_and_Care.backend.dto.UpdateTherapistSettingsRequest;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Objects;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    // upload folder (served via WebConfig below)
    private static final String UPLOAD_DIR = "uploads/profile-pics";

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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

        userRepository.save(user);
        return toProfileResponse(user);
    }

    // ✅ Everyone can update avatar
    public ProfileResponse updateMyAvatar(Authentication authentication, MultipartFile file) {
        User user = getUserFromAuth(authentication);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed.");
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

            // This URL works with the WebConfig mapping below:
            String url = "/uploads/profile-pics/" + filename;
            user.setProfilePictureUrl(url);

            userRepository.save(user);
            return toProfileResponse(user);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload avatar.");
        }
    }

    // ✅ Therapist-only
    public ProfileResponse updateTherapistSettings(Authentication authentication, UpdateTherapistSettingsRequest req) {
        User user = getUserFromAuth(authentication);

        if (user.getRole() != Role.THERAPIST) {
            throw new RuntimeException("Only therapists can update therapist settings.");
        }

        user.setPricePerSession(req.getPricePerSession());
        user.setAvailableDays(req.getAvailableDays());

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

    private ProfileResponse toProfileResponse(User user) {
        ProfileResponse res = new ProfileResponse();
        res.setUsername(user.getUsername());
        res.setUserEmail(user.getUserEmail());
        res.setFirstName(user.getFirstName());
        res.setLastName(user.getLastName());
        res.setPhoneNumber(user.getPhoneNumber());
        res.setRole(user.getRole());
        res.setProfilePictureUrl(user.getProfilePictureUrl());

        // Only include therapist fields if therapist (optional, but clean)
        if (user.getRole() == Role.THERAPIST) {
            res.setPricePerSession(user.getPricePerSession());
            res.setAvailableDays(user.getAvailableDays());
        } else {
            res.setPricePerSession(null);
            res.setAvailableDays(null);
        }

        return res;
    }
}
