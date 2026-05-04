package com.tailorstudio.app.web;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Anonymous endpoints used to warm cold instances (e.g. Render) and greet the SPA on first paint.
 */
@RestController
@RequestMapping("/api")
public class PublicBootController {

    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(0, TimeUnit.SECONDS).noStore().mustRevalidate())
                .body(Map.of("ok", true, "status", "up"));
    }

    @GetMapping(value = "/welcome", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> welcome() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(0, TimeUnit.SECONDS).noStore().mustRevalidate())
                .body(
                        Map.of(
                                "ok",
                                true,
                                "message",
                                "Welcome to Tailor Studio",
                                "tagline",
                                "Measure twice, stitch once."));
    }
}
