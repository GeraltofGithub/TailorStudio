package com.tailorstudio.app.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    public StudioUserDetails requireUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof StudioUserDetails sud)) {
            throw new IllegalStateException("Not authenticated");
        }
        return sud;
    }

    public StudioUserDetails getUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof StudioUserDetails sud)) {
            return null;
        }
        return sud;
    }
}
