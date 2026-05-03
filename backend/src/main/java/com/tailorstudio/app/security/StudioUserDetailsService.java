package com.tailorstudio.app.security;

import com.tailorstudio.app.service.UserAuthLookup;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudioUserDetailsService implements UserDetailsService {

    private final UserAuthLookup userAuthLookup;

    public StudioUserDetailsService(UserAuthLookup userAuthLookup) {
        this.userAuthLookup = userAuthLookup;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var user = userAuthLookup.findByEmailFlexible(username).orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return new StudioUserDetails(user);
    }
}
