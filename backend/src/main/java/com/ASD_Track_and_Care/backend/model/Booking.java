package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // user who booked
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // therapist in users table
    @Column(name = "therapist_id", nullable = false)
    private Long therapistId;

    @Column(name = "session_date", nullable = false)
    private LocalDate date;

    // store time as "HH:mm" to keep frontend simple
    @Column(name = "session_time", nullable = false, length = 10)
    private String time;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BookingStatus status = BookingStatus.PENDING;

    // Khalti reference (optional for now)
    @Column(name = "khalti_pidx", length = 80)
    private String khaltiPidx;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Booking() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getTherapistId() { return therapistId; }
    public void setTherapistId(Long therapistId) { this.therapistId = therapistId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }

    public String getKhaltiPidx() { return khaltiPidx; }
    public void setKhaltiPidx(String khaltiPidx) { this.khaltiPidx = khaltiPidx; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
