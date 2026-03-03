package com.ASD_Track_and_Care.backend.controller;

import com.ASD_Track_and_Care.backend.dto.BookingChatMessageRequest;
import com.ASD_Track_and_Care.backend.dto.BookingChatMessageResponse;
import com.ASD_Track_and_Care.backend.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.List;

@Controller
public class BookingChatWebSocketController {

    private final BookingService bookingService;
    private final SimpMessagingTemplate simpMessagingTemplate;

    public BookingChatWebSocketController(BookingService bookingService, SimpMessagingTemplate simpMessagingTemplate) {
        this.bookingService = bookingService;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    @MessageMapping("/bookings/{bookingId}/chat.send")
    public void sendMessage(
            @DestinationVariable("bookingId") Long bookingId,
            @Valid BookingChatMessageRequest req,
            Principal principal
    ) {
        if (principal == null || principal.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }

        BookingChatMessageResponse saved = bookingService.sendBookingChatMessage(principal.getName(), bookingId, req);
        List<String> usernames = bookingService.getBookingParticipantUsernames(bookingId);

        for (String username : usernames) {
            simpMessagingTemplate.convertAndSendToUser(username, "/queue/bookings/" + bookingId, saved);
        }
    }
}
