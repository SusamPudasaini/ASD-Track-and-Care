package com.ASD_Track_and_Care.backend.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
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
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import com.ASD_Track_and_Care.backend.security.JwtUtil;
import com.ASD_Track_and_Care.backend.service.EmailService;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

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

        String firstName = request.getFirstName().trim();
        String lastName = request.getLastName().trim();
        String username = request.getUsername().trim();
        String phoneNumber = request.getPhoneNumber().trim();
        String email = request.getEmail().trim();
        String password = request.getPassword();

        if (firstName.length() < 2) {
            return ResponseEntity.badRequest().body("First name must be at least 2 characters.");
        }

        if (lastName.length() < 2) {
            return ResponseEntity.badRequest().body("Last name must be at least 2 characters.");
        }

        if (!username.matches("^[a-zA-Z0-9_]{3,20}$")) {
            return ResponseEntity.badRequest()
                    .body("Username must be 3–20 characters using letters, numbers or underscore.");
        }

        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return ResponseEntity.badRequest().body("Please enter a valid email address.");
        }

        String digitsOnlyPhone = phoneNumber.replaceAll("\\D", "");
        if (digitsOnlyPhone.length() < 7 || digitsOnlyPhone.length() > 15) {
            return ResponseEntity.badRequest().body("Enter a valid phone number (7–15 digits).");
        }

        if (password.length() < 6) {
            return ResponseEntity.badRequest().body("Password must be at least 6 characters.");
        }

        if (!password.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            return ResponseEntity.badRequest()
                    .body("Password must contain at least one special character.");
        }

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Username is already taken.");
        }

        if (userRepository.existsByUserEmailIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email is already registered.");
        }

        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Phone number is already registered.");
        }

        String token = UUID.randomUUID().toString();
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(30);

        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setUsername(username);
        user.setPhoneNumber(phoneNumber);
        user.setUserEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmailVerified(false);
        user.setVerificationToken(token);
        user.setVerificationTokenExpiry(expiry);
        user.setRole(Role.USER);

        userRepository.save(user);

        String verifyLink = frontendBaseUrl + "/verify-email?token=" + token;
        emailService.sendVerificationEmail(email, verifyLink);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Signup successful. Please verify your email before logging in.");
    }

    @GetMapping("/check-availability")
    public ResponseEntity<?> checkAvailability(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phoneNumber) {

        Map<String, Object> response = new HashMap<>();

        if (username != null && !username.trim().isEmpty()) {
            String cleanUsername = username.trim();
            boolean usernameExists = userRepository.existsByUsername(cleanUsername);

            response.put("usernameAvailable", !usernameExists);
            response.put("usernameMessage",
                    usernameExists ? "Username is already taken." : "Username is available.");
        }

        if (email != null && !email.trim().isEmpty()) {
            String cleanEmail = email.trim();
            boolean emailExists = userRepository.existsByUserEmailIgnoreCase(cleanEmail);

            response.put("emailAvailable", !emailExists);
            response.put("emailMessage",
                    emailExists ? "Email is already registered." : "Email is available.");
        }

        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            String cleanPhoneNumber = phoneNumber.trim();
            boolean phoneExists = userRepository.existsByPhoneNumber(cleanPhoneNumber);

            response.put("phoneAvailable", !phoneExists);
            response.put("phoneMessage",
                    phoneExists ? "Phone number is already registered." : "Phone number is available.");
        }

        return ResponseEntity.ok(response);
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

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid username or password");
        }

        if (!user.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("EMAIL_NOT_VERIFIED");
        }

        String roleName = (user.getRole() == null) ? "USER" : user.getRole().name();
        String token = jwtUtil.generateToken(user.getUsername(), roleName);

        return ResponseEntity.ok(new LoginResponse(token));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ResendVerificationRequest req) {

        if (req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required.");
        }

        Optional<User> userOpt = userRepository.findByUsername(req.getUsername().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }

        User user = userOpt.get();

        if (user.isEmailVerified()) {
            return ResponseEntity.ok("Email already verified. You can login.");
        }

        String token = UUID.randomUUID().toString();
        user.setVerificationToken(token);
        user.setVerificationTokenExpiry(LocalDateTime.now().plusMinutes(30));
        userRepository.save(user);

        String verifyLink = frontendBaseUrl + "/verify-email?token=" + token;
        emailService.sendVerificationEmail(user.getUserEmail(), verifyLink);

        return ResponseEntity.ok("Verification link resent. Please check your email.");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody com.ASD_Track_and_Care.backend.dto.ForgotPasswordRequest req) {

        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required.");
        }

        String email = req.getEmail().trim();
        Optional<User> userOpt = userRepository.findByUserEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.ok("If that email exists, a reset link was sent.");
        }

        User user = userOpt.get();

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(30));
        userRepository.save(user);

        String resetLink = frontendBaseUrl + "/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(user.getUserEmail(), resetLink);

        return ResponseEntity.ok("If that email exists, a reset link was sent.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody com.ASD_Track_and_Care.backend.dto.ResetPasswordRequest req) {

        if (req.getToken() == null || req.getToken().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Reset token is required.");
        }

        if (req.getNewPassword() == null || req.getNewPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("New password is required.");
        }

        if (req.getNewPassword().length() < 6) {
            return ResponseEntity.badRequest().body("Password must be at least 6 characters.");
        }

        Optional<User> userOpt = userRepository.findByResetToken(req.getToken().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid reset token.");
        }

        User user = userOpt.get();

        if (user.getResetTokenExpiry() == null ||
            user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Reset token expired. Please request again.");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok("Password reset successful. You can login now.");
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}