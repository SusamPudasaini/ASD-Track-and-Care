package com.ASD_Track_and_Care.backend.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {

    private static final long EXPIRATION_MS = Duration.ofDays(1).toMillis(); // 1 day
    private static final long ALLOWED_SKEW_SECONDS = 60; // allow 1 minute clock drift

    private final SecretKey key;

    public JwtUtil(@Value("${jwt.secret}") String secret) {
        // HS256 requires a sufficiently long secret (>= 32 bytes recommended)
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // include role in token
    public String generateToken(String username, String role) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(username)
                .claim("role", role) // e.g., "ADMIN", "USER", "THERAPIST"
                .issuedAt(new Date(now))
                .expiration(new Date(now + EXPIRATION_MS))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    // keep old signature if other code still calls it
    public String generateToken(String username) {
        return generateToken(username, "USER");
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractRole(String token) {
        Object role = extractAllClaims(token).get("role");
        return role == null ? null : role.toString();
    }

    /**
     * Validates:
     * - signature
     * - expiration
     * - subject matches expectedUsername
     */
    public boolean isTokenValid(String token, String expectedUsername) {
        try {
            Claims claims = extractAllClaims(token);
            String username = claims.getSubject();
            Date exp = claims.getExpiration();

            if (username == null || !username.equals(expectedUsername)) return false;
            if (exp == null) return false;

            return exp.after(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims extractAllClaims(String token) {
    	return Jwts.parser()
    		    .verifyWith(key)
    		    .clockSkewSeconds(60)
    		    .build()
    		    .parseSignedClaims(token)
    		    .getPayload();
    }
}
