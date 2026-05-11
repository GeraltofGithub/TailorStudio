package com.tailorstudio.app.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Configuration
public class CorsConfig {

    /**
     * When {@code FRONTEND_URL} points at {@code localhost} / {@code 127.0.0.1}, also allow common Vite ports
     * so a mismatch (e.g. .env says :5174 but {@code npm run dev} uses :5173) does not produce CORS 403.
     */
    private static final List<String> LOCAL_VITE_ORIGINS = List.of(
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174");

    private static boolean isLocalhostStyleOrigin(String o) {
        return o.startsWith("http://localhost:") || o.startsWith("http://127.0.0.1:");
    }

    /**
     * Comma-separated list of allowed frontend origins.
     * Examples:
     * - http://localhost:5173
     * - https://tailor-studio.vercel.app
     */
    @Value("${app.cors.allowed-origins:${FRONTEND_URL:http://localhost:5173}}")
    private String allowedOriginsRaw;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowCredentials(true);
        cfg.setAllowedHeaders(
                List.of("Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setExposedHeaders(List.of("Location"));

        List<String> parsed = List.of(allowedOriginsRaw.split(","))
                .stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    if (!s.startsWith("http://") && !s.startsWith("https://")) {
                        // Default to https:// if no protocol is provided
                        return "https://" + s;
                    }
                    return s;
                })
                .toList();

        Set<String> merged = new LinkedHashSet<>(parsed);
        boolean anyLocal = parsed.stream().anyMatch(CorsConfig::isLocalhostStyleOrigin);
        if (anyLocal) {
            merged.addAll(LOCAL_VITE_ORIGINS);
        }
        cfg.setAllowedOrigins(new ArrayList<>(merged));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}

