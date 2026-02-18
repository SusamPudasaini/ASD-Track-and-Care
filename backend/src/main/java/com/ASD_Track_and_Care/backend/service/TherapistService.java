package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.TherapistCardResponse;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TherapistService {

    private final UserRepository userRepository;

    public TherapistService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<TherapistCardResponse> listTherapists() {
        List<User> therapists = userRepository.findAllByRole(Role.THERAPIST);

        return therapists.stream().map(u -> {
            String name = (u.getFirstName() + " " + u.getLastName()).trim();
            String qualification = (u.getQualification() == null || u.getQualification().isBlank()) ? "—" : u.getQualification();

            return new TherapistCardResponse(
                    u.getId(),
                    name,
                    qualification,
                    u.getPricePerSession(),   // from User table
                    u.getProfilePictureUrl()  // from User table
            );
        }).collect(Collectors.toList());
    }
}
