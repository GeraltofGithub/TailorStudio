package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.Business;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface BusinessRepository extends MongoRepository<Business, Long> {

    Optional<Business> findByJoinCode(String joinCode);
}
