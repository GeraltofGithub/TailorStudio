package com.tailorstudio.app.security;

import com.tailorstudio.app.domain.User;
import com.tailorstudio.app.domain.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collection;
import java.util.List;

public class StudioUserDetails implements UserDetails, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Long userId;
    private final Long businessId;
    private final UserRole role;
    private final String email;
    private final String passwordHash;
    private final String fullName;
    private final boolean enabled;

    public StudioUserDetails(User user) {
        this.userId = user.getId();
        this.businessId = user.getBusinessId();
        this.role = user.getRole();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.fullName = user.getFullName();
        this.enabled = user.isEnabled();
    }

    public Long getUserId() {
        return userId;
    }

    public Long getBusinessId() {
        return businessId;
    }

    public UserRole getRole() {
        return role;
    }

    public String getFullName() {
        return fullName;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String r = "ROLE_" + role.name();
        return List.of(new SimpleGrantedAuthority(r));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
