package com.tailorstudio.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * For cross-origin SPA deployments, JS cannot read the CSRF cookie (different domain).
 * Expose the CSRF token value via a response header so the frontend can store and send it back.
 */
public class CsrfHeaderFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        CsrfToken token = (CsrfToken) request.getAttribute("_csrf");
        if (token != null && token.getToken() != null && !token.getToken().isBlank()) {
            // Spring expects this header on write requests when using CookieCsrfTokenRepository.
            response.setHeader("X-XSRF-TOKEN", token.getToken());
        }
        filterChain.doFilter(request, response);
    }
}

