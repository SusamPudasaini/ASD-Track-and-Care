package com.ASD_Track_and_Care.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ActivityResultSchemaFix {

    private static final Logger log = LoggerFactory.getLogger(ActivityResultSchemaFix.class);
    private final JdbcTemplate jdbcTemplate;

    public ActivityResultSchemaFix(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureActivityTypeColumnSupportsNewValues() {
        try {
            jdbcTemplate.execute("ALTER TABLE `activity_results` MODIFY COLUMN `type` VARCHAR(50) NOT NULL");
            log.info("Ensured activity_results.type uses VARCHAR(50) for flexible activity type storage");
        } catch (Exception ex) {
            log.warn("Could not adjust activity_results.type column (safe to ignore if table does not exist yet): {}", ex.getMessage());
        }
    }
}
