package com.ASD_Track_and_Care.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ASD_Track_and_Care.backend.model.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);
    boolean existsByUserEmail(String userEmail);

    Optional<User> findByVerificationToken(String verificationToken);
    Optional<User> findByUserEmail(String userEmail);
    
    Optional<User> findByResetToken(String resetToken);

}
