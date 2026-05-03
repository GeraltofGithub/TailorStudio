package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.OtpChallenge;
import com.tailorstudio.app.domain.OtpPurpose;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Optional;

public interface OtpChallengeRepository extends MongoRepository<OtpChallenge, String> {

    void deleteByEmailIgnoreCaseAndPurpose(String email, OtpPurpose purpose);

    /** Prefer this for verification: newest non-expired row only. */
    Optional<OtpChallenge> findTopByEmailIgnoreCaseAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(
            String email, OtpPurpose purpose, Instant now);
}
