package com.tailorstudio.app.security;

import com.tailorstudio.app.domain.User;
import com.tailorstudio.app.repo.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Ensures the HTTP session carries the current {@link User#getSessionEpoch()}. When a user signs in
 * elsewhere, epoch bumps and older sessions become invalid (401).
 */
public class SessionEpochEnforcementFilter extends OncePerRequestFilter {

    public static final String SESSION_EPOCH_ATTR = "TS_LOGIN_EPOCH";

    private final UserRepository userRepository;

    public SessionEpochEnforcementFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null
                || !auth.isAuthenticated()
                || auth instanceof AnonymousAuthenticationToken
                || !(auth.getPrincipal() instanceof StudioUserDetails)) {
            filterChain.doFilter(request, response);
            return;
        }

        StudioUserDetails principal = (StudioUserDetails) auth.getPrincipal();
        HttpSession session = request.getSession(false);
        if (session == null) {
            filterChain.doFilter(request, response);
            return;
        }

        User user = userRepository.findById(principal.getUserId()).orElse(null);
        if (user == null) {
            filterChain.doFilter(request, response);
            return;
        }

        long dbEpoch = user.getSessionEpoch() == null ? 0L : user.getSessionEpoch();
        Long attr = (Long) session.getAttribute(SESSION_EPOCH_ATTR);

        if (attr == null) {
            terminateSession(request, response, "session_epoch_missing");
            return;
        }

        if (!attr.equals(dbEpoch)) {
            terminateSession(request, response, "session_superseded");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void terminateSession(HttpServletRequest request, HttpServletResponse response, String error)
            throws IOException {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        if (request.getRequestURI().startsWith("/api/")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"" + error + "\"}");
            return;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"" + error + "\"}");
    }
}
