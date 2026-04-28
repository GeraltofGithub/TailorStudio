package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.Customer;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CustomerRepository extends MongoRepository<Customer, Long>, CustomerRepositoryCustom {

    List<Customer> findByBusinessIdOrderByNameAsc(Long businessId);

    List<Customer> findByBusinessIdAndActiveTrueOrderByNameAsc(Long businessId);
}
