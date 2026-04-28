package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.Business;
import com.tailorstudio.app.domain.User;
import com.tailorstudio.app.domain.UserRole;
import com.tailorstudio.app.repo.BusinessRepository;
import com.tailorstudio.app.repo.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;

@Service
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(BusinessRepository businessRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.businessRepository = businessRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void registerStudio(
            String businessName,
            String tagline,
            String address,
            String phone,
            String secondaryPhone,
            String ownerName,
            String email,
            String rawPassword) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email already registered");
        }
        Business b = new Business();
        b.setName(businessName);
        b.setTagline(tagline);
        b.setAddress(address);
        b.setPhone(phone);
        b.setSecondaryPhone(secondaryPhone);
        b.setJoinCode(generateJoinCode());
        businessRepository.save(b);

        User u = new User();
        u.setEmail(email.trim().toLowerCase());
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        u.setFullName(ownerName);
        u.setRole(UserRole.OWNER);
        u.setBusiness(b);
        userRepository.save(u);
    }

    @Transactional
    public void registerStaff(String joinCode, String fullName, String email, String rawPassword) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email already registered");
        }
        Business b = businessRepository.findByJoinCode(joinCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid studio code"));
        User u = new User();
        u.setEmail(email.trim().toLowerCase());
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        u.setFullName(fullName);
        u.setRole(UserRole.STAFF);
        u.setBusiness(b);
        u.setInviteNote("Joined with studio code");
        userRepository.save(u);
    }

    @Transactional
    public String rotateJoinCode(Long businessId) {
        Business b = businessRepository.findById(businessId).orElseThrow();
        b.setJoinCode(generateJoinCode());
        businessRepository.save(b);
        return b.getJoinCode();
    }

    private static String generateJoinCode() {
        byte[] bytes = new byte[8];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes).toUpperCase();
    }
}
