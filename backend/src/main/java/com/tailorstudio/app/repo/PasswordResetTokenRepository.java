package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.PasswordResetToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends MongoRepository<PasswordResetToken, String> {

    Optional<PasswordResetToken> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);

    void deleteByUserId(Long userId);
}
