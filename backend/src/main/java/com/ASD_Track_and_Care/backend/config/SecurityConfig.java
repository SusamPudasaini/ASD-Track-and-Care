package com.ASD_Track_and_Care.backend.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.ASD_Track_and_Care.backend.security.JwtAuthFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                // allow preflight
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // spring default error endpoint
                .requestMatchers("/error").permitAll()

                // public endpoints
                .requestMatchers("/auth/**").permitAll()

                // ADMIN ONLY
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // THERAPIST ONLY (for therapist actions later)
                .requestMatchers("/api/therapist/**").hasRole("THERAPIST")

                // Any logged-in user
                .requestMatchers("/api/**").authenticated()

                // everything else must be authenticated
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // ✅ When allowCredentials=true, don't use "*" in allowedOrigins. Use patterns instead.
        config.setAllowCredentials(true);

        // ✅ Allow vite dev server from localhost OR 127.0.0.1 on any port (5173/5174/etc)
        config.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*"
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // ✅ Allow all headers (important for Authorization + multipart + custom headers)
        config.setAllowedHeaders(List.of("*"));

        // ✅ Expose headers if you ever need them in frontend
        config.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
