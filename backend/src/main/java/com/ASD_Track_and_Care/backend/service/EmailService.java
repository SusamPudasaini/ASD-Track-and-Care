package com.ASD_Track_and_Care.backend.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String toEmail, String verifyLink) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(toEmail);
        msg.setSubject("Verify your email - ASD Track & Care");
        msg.setText(
                "Thank you for signing up!\n\n" +
                        "Please verify your email by clicking the link below:\n" +
                        verifyLink + "\n\n" +
                        "If you did not create this account, you can ignore this email."
        );
        mailSender.send(msg);
    }

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(toEmail);
        msg.setSubject("Reset your password - ASD Track & Care");
        msg.setText("Click the link to reset your password:\n" + resetLink + "\n\nIf you did not request this, ignore this email.");
        mailSender.send(msg);
    }

    // ✅ NEW: Therapist application decision email
    public void sendTherapistApplicationDecisionEmail(String toEmail, String status, String adminMessage) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(toEmail);
        msg.setSubject("Therapist Application Update - ASD Track & Care");

        StringBuilder body = new StringBuilder();
        body.append("Your therapist application has been reviewed.\n\n");
        body.append("Status: ").append(status).append("\n\n");

        if (adminMessage != null && !adminMessage.trim().isEmpty()) {
            body.append("Message from admin:\n");
            body.append(adminMessage.trim()).append("\n\n");
        }

        body.append("You can also view the decision inside your account.\n");
        body.append("\nASD Track & Care Team");

        msg.setText(body.toString());
        mailSender.send(msg);
    }
}
