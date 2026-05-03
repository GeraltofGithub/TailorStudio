package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.PendingLogin;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Optional;

public interface PendingLoginRepository extends MongoRepository<PendingLogin, String> {

    void deleteByEmailIgnoreCase(String email);

    Optional<PendingLogin> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);
}
