package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.ProfileResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateProfileRequest;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public ProfileResponse getMyProfile(Authentication authentication) {
        User user = resolveCurrentUser(authentication);
        return toProfileResponse(user);
    }

    public ProfileResponse updateMyProfile(Authentication authentication, UpdateProfileRequest req) {
        User user = resolveCurrentUser(authentication);

        user.setFirstName(req.getFirstName());
        user.setLastName(req.getLastName());
        user.setPhoneNumber(req.getPhoneNumber());

        userRepository.save(user);
        return toProfileResponse(user);
    }

    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }

        String principal = authentication.getName().trim();

        return userRepository.findByUserEmail(principal)
                .orElseGet(() ->
                        userRepository.findByUsername(principal)
                                .orElseThrow(() -> new RuntimeException("User not found"))
                );
    }

    private ProfileResponse toProfileResponse(User user) {
        return new ProfileResponse(
                user.getUsername(),
                user.getUserEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber()
        );
    }
}
