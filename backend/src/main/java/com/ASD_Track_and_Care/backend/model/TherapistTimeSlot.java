package com.ASD_Track_and_Care.backend.model;

import jakarta.persistence.*;

@Entity
@Table(
        name = "therapist_time_slots",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"therapist_id", "day", "time"})
        }
)
public class TherapistTimeSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "therapist_id", nullable = false)
    private Long therapistId;

    @Enumerated(EnumType.STRING)
    @Column(name = "day", nullable = false, length = 15)
    private AvailabilityDay day;

    // stored as "HH:mm"
    @Column(name = "time", nullable = false, length = 5)
    private String time;

    public TherapistTimeSlot() {}

    public TherapistTimeSlot(Long therapistId, AvailabilityDay day, String time) {
        this.therapistId = therapistId;
        this.day = day;
        this.time = time;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTherapistId() { return therapistId; }
    public void setTherapistId(Long therapistId) { this.therapistId = therapistId; }

    public AvailabilityDay getDay() { return day; }
    public void setDay(AvailabilityDay day) { this.day = day; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
}
