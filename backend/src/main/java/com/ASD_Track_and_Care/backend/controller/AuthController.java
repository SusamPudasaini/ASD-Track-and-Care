package com.ASD_Track_and_Care.backend.controller;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ASD_Track_and_Care.backend.dto.LoginRequest;
import com.ASD_Track_and_Care.backend.dto.LoginResponse;
import com.ASD_Track_and_Care.backend.dto.SignupRequest;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import com.ASD_Track_and_Care.backend.security.JwtUtil;

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

    // ---------- SIGNUP ----------
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {

        // basic required field checks
        if (isBlank(request.getFirstName()) ||
            isBlank(request.getLastName()) ||
            isBlank(request.getUsername()) ||
            isBlank(request.getPhoneNumber()) ||
            isBlank(request.getEmail()) ||
            isBlank(request.getPassword())) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("All fields are required.");
        }

        String username = request.getUsername().trim();
        String email = request.getEmail().trim();

        // duplicates
        if (userRepository.existsByUsername(username)) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("Username is already taken.");
        }

        if (userRepository.existsByUserEmail(email)) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("Email is already registered.");
        }

        // create user
        User user = new User();
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setUsername(username);
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setUserEmail(email);

        // hash password
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);

        // Option A: Just return success message (your frontend redirects to /login)
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body("User registered successfully.");

        // Option B (optional): auto-login after signup
        // String token = jwtUtil.generateToken(user.getUsername());
        // return ResponseEntity.status(HttpStatus.CREATED).body(new LoginResponse(token));
    }

    // ---------- LOGIN (unchanged logic) ----------
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        Optional<User> userOpt =
                userRepository.findByUsername(request.getUsername());

        if (userOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid username or password");
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.ok(new LoginResponse(token));
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
