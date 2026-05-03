package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.User;
import com.tailorstudio.app.repo.UserRepository;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

/**
 * Resolves users by email: prefers indexed exact match on normalized address, then case-insensitive match
 * for legacy documents where stored casing may differ.
 */
@Component
public class UserAuthLookup {

    private final UserRepository userRepository;

    public UserAuthLookup(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> findByEmailFlexible(String emailRaw) {
        if (emailRaw == null) {
            return Optional.empty();
        }
        String trimmed = emailRaw.trim();
        if (trimmed.isEmpty()) {
            return Optional.empty();
        }
        String normalized = trimmed.toLowerCase(Locale.ROOT);
        return userRepository.findByEmail(normalized).or(() -> userRepository.findByEmailIgnoreCase(trimmed));
    }
}
