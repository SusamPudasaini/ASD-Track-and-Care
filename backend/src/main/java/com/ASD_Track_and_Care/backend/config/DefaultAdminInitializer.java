package com.ASD_Track_and_Care.backend.config;

import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DefaultAdminInitializer implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DefaultAdminInitializer.class);

    private static final String DEFAULT_USERNAME = "Susam";
    private static final String DEFAULT_PASSWORD = "Susam@123";
    private static final String DEFAULT_FIRST_NAME = "Susam";
    private static final String DEFAULT_LAST_NAME = "Admin";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DefaultAdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByUsernameIgnoreCase(DEFAULT_USERNAME).isPresent()) {
            logger.info("Default admin username '{}' already exists. Skipping seed.", DEFAULT_USERNAME);
            return;
        }

        User admin = new User();
        admin.setFirstName(DEFAULT_FIRST_NAME);
        admin.setLastName(DEFAULT_LAST_NAME);
        admin.setUsername(DEFAULT_USERNAME);
        admin.setUserEmail(nextAvailableEmail());
        admin.setPhoneNumber(nextAvailablePhoneNumber());
        admin.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
        admin.setRole(Role.ADMIN);
        admin.setEmailVerified(true);

        userRepository.save(admin);
        logger.info("Seeded default admin user '{}' with role ADMIN.", DEFAULT_USERNAME);
    }

    private String nextAvailableEmail() {
        String base = "susam.admin";
        String domain = "@asdtrack.local";
        String candidate = base + domain;
        int suffix = 1;

        while (userRepository.existsByUserEmailIgnoreCase(candidate)) {
            candidate = base + suffix + domain;
            suffix++;
        }

        return candidate;
    }

    private String nextAvailablePhoneNumber() {
        long base = 9800000000L;
        long max = 9999999999L;
        long current = base;

        while (current <= max) {
            String candidate = String.valueOf(current);
            if (!userRepository.existsByPhoneNumber(candidate)) {
                return candidate;
            }
            current++;
        }

        throw new IllegalStateException("Unable to allocate phone number for default admin seed user.");
    }
}
