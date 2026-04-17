package com.ASD_Track_and_Care.backend.exception;

public class BookingPaymentNotMadeException extends RuntimeException {

    public static final String DEFAULT_MESSAGE = "Payment hasn't been made for the booking request.";

    public BookingPaymentNotMadeException() {
        super(DEFAULT_MESSAGE);
    }

    public BookingPaymentNotMadeException(String message) {
        super(message);
    }
}
