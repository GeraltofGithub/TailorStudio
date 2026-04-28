package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findByBusiness_IdOrderByNameAsc(Long businessId);

    @Query("SELECT c FROM Customer c WHERE c.business.id = :bid AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')) OR c.phone LIKE CONCAT('%', :q, '%'))")
    List<Customer> search(@Param("bid") Long businessId, @Param("q") String q);
}
