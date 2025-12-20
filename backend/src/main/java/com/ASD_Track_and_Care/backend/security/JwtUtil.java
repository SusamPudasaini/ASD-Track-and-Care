	package com.ASD_Track_and_Care.backend.security;
	
	import java.nio.charset.StandardCharsets;
	import java.security.Key;
	import java.util.Date;
	
	import javax.crypto.SecretKey;
	
	import org.springframework.stereotype.Component;
	
	import io.jsonwebtoken.Claims;
	import io.jsonwebtoken.Jwts;
	import io.jsonwebtoken.security.Keys;
	
	@Component
	public class JwtUtil {
	
	    // 32+ chars (256 bits) required for HS256
	    private static final String SECRET =
	            "mysecretkeymysecretkeymysecretkey12";
	
	    private final SecretKey key =
	            Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
	
	    public String generateToken(String username) {
	        return Jwts.builder()
	                .subject(username)
	                .issuedAt(new Date())
	                .expiration(new Date(System.currentTimeMillis() + 86400000)) // 1 day
	                .signWith(key, Jwts.SIG.HS256)   
	                .compact();
	    }
	
	    public String extractUsername(String token) {
	        Claims claims = Jwts.parser()
	                .verifyWith(key)               
	                .build()
	                .parseSignedClaims(token)       
	                .getPayload();
	
	        return claims.getSubject();
	    }
	}
