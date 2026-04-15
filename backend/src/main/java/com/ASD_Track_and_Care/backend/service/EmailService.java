package com.ASD_Track_and_Care.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String frontendBaseUrl;
    private final String configuredLogoUrl;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:no-reply@asdtrackandcare.com}") String fromAddress,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl,
            @Value("${app.mail.logo-url:}") String configuredLogoUrl
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.frontendBaseUrl = frontendBaseUrl;
        this.configuredLogoUrl = configuredLogoUrl;
    }

    @Async("mailTaskExecutor")
    public void sendVerificationEmail(String toEmail, String verifyLink) {
        String subject = "Verify your email - ASD Track & Care";
        String plainText =
                "Thank you for signing up!\n\n" +
                "Please verify your email by clicking the link below:\n" +
                verifyLink + "\n\n" +
                "If you did not create this account, you can ignore this email.";

        String contentHtml = ""
                + "<p style='margin:0 0 14px;'>Thank you for signing up with ASD Track &amp; Care.</p>"
                + "<p style='margin:0 0 16px;'>Please verify your email to activate your account.</p>";

        String html = buildEmailLayout(
                "Verify your email address",
                "Verify your Email",
                contentHtml,
                "Verify Email",
                verifyLink,
                "If you did not create this account, you can safely ignore this email."
        );

        sendWithLogging("verification", toEmail, subject, plainText, html);
    }

    @Async("mailTaskExecutor")
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        String subject = "Reset your password - ASD Track & Care";
        String plainText = ""
                + "We received a request to reset your password.\n\n"
                + "Use the link below to set a new password:\n"
                + resetLink + "\n\n"
                + "If you did not request this, ignore this email.";

        String contentHtml = ""
                + "<p style='margin:0 0 14px;'>We received a request to reset your password.</p>"
                + "<p style='margin:0 0 16px;'>Click the button below to set a new password.</p>";

        String html = buildEmailLayout(
                "Password reset request",
                "Reset Your Password",
                contentHtml,
                "Reset Password",
                resetLink,
                "If you did not request this, no further action is needed."
        );

        sendWithLogging("password reset", toEmail, subject, plainText, html);
    }

    // Therapist application decision email
    @Async("mailTaskExecutor")
    public void sendTherapistApplicationDecisionEmail(String toEmail, String status, String adminMessage) {
        String safeStatus = status == null ? "PENDING" : status.trim().toUpperCase();
        String subject = "Therapist Application Update - ASD Track & Care";

        StringBuilder plain = new StringBuilder();
        plain.append("Your therapist application has been reviewed.\n\n");
        plain.append("Status: ").append(safeStatus).append("\n\n");
        if (adminMessage != null && !adminMessage.trim().isEmpty()) {
            plain.append("Message from admin:\n");
            plain.append(adminMessage.trim()).append("\n\n");
        }
        plain.append("You can also view the decision inside your account.\n");
        plain.append("\nASD Track & Care Team");

        String badgeBg;
        String badgeText;
        if ("APPROVED".equals(safeStatus)) {
            badgeBg = "#dcfce7";
            badgeText = "#166534";
        } else if ("REJECTED".equals(safeStatus)) {
            badgeBg = "#fee2e2";
            badgeText = "#991b1b";
        } else {
            badgeBg = "#dbeafe";
            badgeText = "#1e3a8a";
        }

        StringBuilder contentHtml = new StringBuilder();
        contentHtml.append("<p style='margin:0 0 12px;'>Your therapist application has been reviewed.</p>");
        contentHtml.append("<p style='margin:0 0 16px;'>Status: ");
        contentHtml.append("<span style='display:inline-block;padding:5px 10px;border-radius:999px;background:")
                .append(badgeBg)
                .append(";color:")
                .append(badgeText)
                .append(";font-weight:700;font-size:12px;'>")
                .append(escapeHtml(safeStatus))
                .append("</span></p>");

        if (adminMessage != null && !adminMessage.trim().isEmpty()) {
            contentHtml.append("<div style='margin:0 0 16px;padding:12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;'>");
            contentHtml.append("<div style='font-weight:700;color:#1e3a8a;margin-bottom:6px;'>Message from admin</div>");
            contentHtml.append("<div style='color:#334155;line-height:1.6;'>")
                    .append(escapeHtml(adminMessage.trim()).replace("\n", "<br/>"))
                    .append("</div></div>");
        }

        String html = buildEmailLayout(
                "Therapist application decision",
                "Application Status Updated",
                contentHtml.toString(),
                "Open Dashboard",
                normalizeBaseUrl(frontendBaseUrl),
                "You can also view this decision inside your account dashboard."
        );

        sendWithLogging("therapist application decision", toEmail, subject, plain.toString(), html);
    }

    // Booking cancelled by therapist (with reason)
    @Async("mailTaskExecutor")
    public void sendBookingCancelledEmail(
            String toEmail,
            String therapistName,
            String date,
            String time,
            String reason,
            boolean wasPaid
    ) {
        String subject = "Your booking was cancelled - ASD Track & Care";
        String safeTherapistName = therapistName == null ? "Therapist" : therapistName;
        String safeDate = date == null ? "-" : date;
        String safeTime = time == null ? "-" : time;
        String safeReason = (reason == null || reason.trim().isEmpty()) ? "(not provided)" : reason.trim();

        StringBuilder plain = new StringBuilder();
        plain.append("Your booking has been cancelled by your therapist.\n\n");
        plain.append("Therapist: ").append(safeTherapistName).append("\n");
        plain.append("Date: ").append(safeDate).append("\n");
        plain.append("Time: ").append(safeTime).append("\n\n");
        plain.append("Reason:\n").append(safeReason).append("\n\n");
        if (wasPaid) {
            plain.append("Your payment will be refunded.\n\n");
        }
        plain.append("You can book another session anytime from your account.\n");
        plain.append("\nASD Track & Care Team");

        StringBuilder contentHtml = new StringBuilder();
        contentHtml.append("<p style='margin:0 0 14px;'>Your booking has been cancelled by your therapist.</p>");
        contentHtml.append("<table role='presentation' style='width:100%;border-collapse:separate;border-spacing:0;margin:0 0 14px;'>");
        contentHtml.append("<tr><td style='padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;'>Therapist</td>")
                .append("<td style='padding:8px 10px;background:#ffffff;border:1px solid #e2e8f0;color:#0f172a;font-weight:600;'>")
                .append(escapeHtml(safeTherapistName)).append("</td></tr>");
        contentHtml.append("<tr><td style='padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;'>Date</td>")
                .append("<td style='padding:8px 10px;background:#ffffff;border:1px solid #e2e8f0;color:#0f172a;font-weight:600;'>")
                .append(escapeHtml(safeDate)).append("</td></tr>");
        contentHtml.append("<tr><td style='padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;'>Time</td>")
                .append("<td style='padding:8px 10px;background:#ffffff;border:1px solid #e2e8f0;color:#0f172a;font-weight:600;'>")
                .append(escapeHtml(safeTime)).append("</td></tr>");
        contentHtml.append("</table>");

        contentHtml.append("<div style='margin:0 0 16px;padding:12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;'>");
        contentHtml.append("<div style='font-weight:700;color:#1e3a8a;margin-bottom:6px;'>Reason</div>");
        contentHtml.append("<div style='color:#334155;line-height:1.6;'>")
                .append(escapeHtml(safeReason).replace("\n", "<br/>"))
                .append("</div></div>");

        if (wasPaid) {
            contentHtml.append("<p style='margin:0 0 14px;color:#166534;font-weight:600;'>Your payment will be refunded.</p>");
        }

        String html = buildEmailLayout(
                "Booking cancellation notice",
                "Booking Cancelled",
                contentHtml.toString(),
                "Book Another Session",
                normalizeBaseUrl(frontendBaseUrl) + "/bookings",
                "You can schedule a new session anytime from your account."
        );

        sendWithLogging("booking cancelled", toEmail, subject, plain.toString(), html);
    }

    private void sendWithLogging(String mailType, String toEmail, String subject, String plainText, String htmlText) {
        long startedAt = System.nanoTime();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(plainText, htmlText);

            mailSender.send(message);
            long elapsedMs = (System.nanoTime() - startedAt) / 1_000_000;
            log.info("Email sent type={} to={} in {} ms", mailType, toEmail, elapsedMs);
        } catch (Exception ex) {
            long elapsedMs = (System.nanoTime() - startedAt) / 1_000_000;
            log.error("Email send failed type={} to={} after {} ms", mailType, toEmail, elapsedMs, ex);
        }
    }

    private String buildEmailLayout(
            String preheader,
            String headline,
            String contentHtml,
            String ctaLabel,
            String ctaUrl,
            String footerNote
    ) {
        String logoUrl = resolveLogoUrl();
        String safePreheader = escapeHtml(preheader == null ? "" : preheader);
        String safeHeadline = escapeHtml(headline == null ? "" : headline);
        String safeFooter = escapeHtml(footerNote == null ? "" : footerNote);

        String ctaBlock = "";
        if (ctaLabel != null && !ctaLabel.isBlank() && ctaUrl != null && !ctaUrl.isBlank()) {
            ctaBlock = ""
                    + "<div style='margin:24px 0 16px;'>"
                    + "  <a href='" + escapeHtmlAttribute(ctaUrl) + "'"
                    + "     style='display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;'>"
                    + escapeHtml(ctaLabel)
                    + "  </a>"
                    + "</div>";
        }

        return ""
                + "<!doctype html>"
                + "<html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                + "<title>ASD Track &amp; Care</title></head>"
                + "<body style='margin:0;padding:0;background:#eaf2ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;'>"
                + "  <div style='display:none;max-height:0;overflow:hidden;opacity:0;'>" + safePreheader + "</div>"
                + "  <table role='presentation' style='width:100%;border-collapse:collapse;padding:24px 12px;'>"
                + "    <tr><td align='center'>"
                + "      <table role='presentation' style='width:100%;max-width:640px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbeafe;'>"
                + "        <tr><td style='padding:20px 24px;background:linear-gradient(120deg,#1d4ed8,#2563eb);text-align:center;'>"
                + "          <img src='" + escapeHtmlAttribute(logoUrl) + "' alt='ASD Track and Care' style='display:block;margin:0 auto 10px auto;max-width:180px;height:auto;'/>"
                + "          <div style='color:#dbeafe;font-size:13px;font-weight:600;letter-spacing:0.4px;'>Care. Track. Support.</div>"
                + "        </td></tr>"
                + "        <tr><td style='padding:26px 24px 20px;'>"
                + "          <h1 style='margin:0 0 14px;font-size:24px;line-height:1.25;color:#1e3a8a;'>" + safeHeadline + "</h1>"
                +            contentHtml
                +            ctaBlock
                + "          <hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0 14px;'/>"
                + "          <p style='margin:0;color:#64748b;font-size:13px;line-height:1.6;'>" + safeFooter + "</p>"
                + "        </td></tr>"
                + "      </table>"
                + "      <p style='margin:14px 0 0;color:#64748b;font-size:12px;'>ASD Track &amp; Care</p>"
                + "    </td></tr>"
                + "  </table>"
                + "</body></html>";
    }

    private String resolveLogoUrl() {
        if (configuredLogoUrl != null && !configuredLogoUrl.isBlank()) {
            return configuredLogoUrl.trim();
        }
        return normalizeBaseUrl(frontendBaseUrl) + "/images/logo/asd-logo.png";
    }

    private String normalizeBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:5173";
        }
        String s = value.trim();
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    private String escapeHtml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String escapeHtmlAttribute(String value) {
        return escapeHtml(value).replace("`", "");
    }
}
