package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.Business;
import com.tailorstudio.app.domain.User;
import com.tailorstudio.app.domain.UserRole;
import com.tailorstudio.app.mongo.SequenceService;
import com.tailorstudio.app.repo.BusinessRepository;
import com.tailorstudio.app.repo.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SequenceService seq;

    public AuthService(BusinessRepository businessRepository, UserRepository userRepository, PasswordEncoder passwordEncoder, SequenceService seq) {
        this.businessRepository = businessRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seq = seq;
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
        String em = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(em)) {
            throw new IllegalArgumentException("Email already registered");
        }
        Business b = new Business();
        b.setId(seq.next("businesses"));
        if (b.getMongoObjectId() == null || b.getMongoObjectId().isBlank()) {
            b.setMongoObjectId(new org.bson.types.ObjectId().toHexString());
        }
        b.setName(businessName);
        b.setTagline(tagline);
        b.setAddress(address);
        b.setPhone(phone);
        b.setSecondaryPhone(secondaryPhone);
        b.setJoinCode(generateJoinCode());
        businessRepository.save(b);

        User u = new User();
        u.setId(seq.next("users"));
        if (u.getMongoObjectId() == null || u.getMongoObjectId().isBlank()) {
            u.setMongoObjectId(new org.bson.types.ObjectId().toHexString());
        }
        u.setEmail(em);
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        u.setFullName(ownerName);
        u.setRole(UserRole.OWNER);
        u.setBusiness(b);
        userRepository.save(u);
    }

    @Transactional
    public void registerStaff(String joinCode, String fullName, String email, String rawPassword) {
        String em = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(em)) {
            throw new IllegalArgumentException("Email already registered");
        }
        Business b = businessRepository.findByJoinCode(joinCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid studio code"));
        User u = new User();
        u.setId(seq.next("users"));
        if (u.getMongoObjectId() == null || u.getMongoObjectId().isBlank()) {
            u.setMongoObjectId(new org.bson.types.ObjectId().toHexString());
        }
        u.setEmail(em);
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

    @Transactional
    public void updatePasswordForUser(Long userId, String rawPassword) {
        User u = userRepository.findById(userId).orElseThrow();
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        userRepository.save(u);
    }

    private static String generateJoinCode() {
        byte[] bytes = new byte[8];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes).toUpperCase();
    }
}
