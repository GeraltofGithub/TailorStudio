package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, Long> {

    /** Exact match on stored lowercase email — uses unique index (fast). */
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByBusinessIdOrderByCreatedAtAsc(Long businessId);
}
