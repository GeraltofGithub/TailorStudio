package com.tailorstudio.app.security;

import com.tailorstudio.app.repo.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class StudioUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public StudioUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String key = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        var user = userRepository.findByEmail(key).orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return new StudioUserDetails(user);
    }
}
