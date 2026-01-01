package com.ASD_Track_and_Care.backend.controller;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.ASD_Track_and_Care.backend.dto.LoginRequest;
import com.ASD_Track_and_Care.backend.dto.LoginResponse;
import com.ASD_Track_and_Care.backend.dto.ResendVerificationRequest;
import com.ASD_Track_and_Care.backend.dto.SignupRequest;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import com.ASD_Track_and_Care.backend.security.JwtUtil;
import com.ASD_Track_and_Care.backend.service.EmailService;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private EmailService emailService;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {

        if (isBlank(request.getFirstName()) ||
            isBlank(request.getLastName()) ||
            isBlank(request.getUsername()) ||
            isBlank(request.getPhoneNumber()) ||
            isBlank(request.getEmail()) ||
            isBlank(request.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("All fields are required.");
        }

        String username = request.getUsername().trim();
        String email = request.getEmail().trim();

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Username is already taken.");
        }
        if (userRepository.existsByUserEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email is already registered.");
        }

        String token = UUID.randomUUID().toString();
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(30);

        User user = new User();
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setUsername(username);
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setUserEmail(email);

        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.setEmailVerified(false);
        user.setVerificationToken(token);
        user.setVerificationTokenExpiry(expiry);

        userRepository.save(user);

        String verifyLink = frontendBaseUrl + "/verify-email?token=" + token;
        emailService.sendVerificationEmail(email, verifyLink);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Signup successful. Please verify your email before logging in.");
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        Optional<User> userOpt = userRepository.findByVerificationToken(token);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid verification token.");
        }

        User user = userOpt.get();

        if (user.isEmailVerified()) {
            return ResponseEntity.ok("Email already verified. You can login.");
        }

        if (user.getVerificationTokenExpiry() == null ||
            user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Verification token expired. Please request a new one.");
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok("Email verified successfully. You can now login.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid username or password");
        }

        User user = userOpt.get();

        // ✅ 1) CHECK PASSWORD FIRST
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid username or password");
        }

        // ✅ 2) THEN CHECK EMAIL VERIFIED
        if (!user.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("EMAIL_NOT_VERIFIED");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.ok(new LoginResponse(token));
    }



    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
    
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ResendVerificationRequest req) {

        if (req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required.");
        }

        Optional<User> userOpt = userRepository.findByUsername(req.getUsername().trim());
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");

        User user = userOpt.get();

        if (user.isEmailVerified()) {
            return ResponseEntity.ok("Email already verified. You can login.");
        }

        String token = java.util.UUID.randomUUID().toString();
        user.setVerificationToken(token);
        user.setVerificationTokenExpiry(java.time.LocalDateTime.now().plusMinutes(30));
        userRepository.save(user);

        String verifyLink = frontendBaseUrl + "/verify-email?token=" + token;
        emailService.sendVerificationEmail(user.getUserEmail(), verifyLink);

        return ResponseEntity.ok("Verification link resent. Please check your email.");
    }


}
