package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByBusiness_IdOrderByCreatedAtAsc(Long businessId);
}
