package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.Business;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BusinessRepository extends JpaRepository<Business, Long> {

    Optional<Business> findByJoinCode(String joinCode);
}
