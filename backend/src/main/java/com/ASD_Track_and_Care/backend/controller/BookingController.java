package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.BookingResponse;
import com.ASD_Track_and_Care.backend.dto.CreateBookingRequest;
import com.ASD_Track_and_Care.backend.dto.RescheduleBookingRequest;
import com.ASD_Track_and_Care.backend.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    // ✅ Create booking -> PENDING
    @PostMapping
    public ResponseEntity<BookingResponse> create(
            Authentication authentication,
            @Valid @RequestBody CreateBookingRequest req
    ) {
        return ResponseEntity.ok(bookingService.createBooking(authentication, req));
    }

    // ✅ Booking history for logged-in user
    @GetMapping("/me")
    public ResponseEntity<List<BookingResponse>> myBookings(Authentication authentication) {
        return ResponseEntity.ok(bookingService.myBookings(authentication));
    }

    // ✅ Therapist dashboard bookings (includes user details)
    @GetMapping("/therapist/me")
    public ResponseEntity<List<BookingResponse>> therapistBookings(Authentication authentication) {
        return ResponseEntity.ok(bookingService.therapistBookings(authentication));
    }

    // ✅ Therapist approves -> CONFIRMED (returns user details too)
    @PutMapping("/{id}/approve")
    public ResponseEntity<BookingResponse> approve(Authentication authentication, @PathVariable("id") Long id) {
        return ResponseEntity.ok(bookingService.approve(authentication, id));
    }

    // ✅ Therapist declines/cancels -> CANCELLED (returns user details too)
    @PutMapping("/{id}/decline")
    public ResponseEntity<BookingResponse> decline(Authentication authentication, @PathVariable("id") Long id) {
        return ResponseEntity.ok(bookingService.decline(authentication, id));
    }

    // ✅ Therapist can revert CONFIRMED/CANCELLED back to PENDING
    @PutMapping("/{id}/mark-pending")
    public ResponseEntity<BookingResponse> markPending(Authentication authentication, @PathVariable("id") Long id) {
        return ResponseEntity.ok(bookingService.markPending(authentication, id));
    }

    // ✅ Reschedule (user)
    @PutMapping("/{id}/reschedule")
    public ResponseEntity<BookingResponse> reschedule(
            Authentication authentication,
            @PathVariable("id") Long id,
            @Valid @RequestBody RescheduleBookingRequest req
    ) {
        return ResponseEntity.ok(bookingService.reschedule(authentication, id, req));
    }

    // ✅ Cancel (user)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancel(Authentication authentication, @PathVariable("id") Long id) {
        bookingService.cancel(authentication, id);
        return ResponseEntity.ok("Booking cancelled");
    }
}
