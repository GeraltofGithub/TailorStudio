package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.OrderStatus;
import com.tailorstudio.app.domain.TailorOrder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TailorOrderRepository extends MongoRepository<TailorOrder, Long>, TailorOrderRepositoryCustom {

    long countByBusinessId(Long businessId);

    List<TailorOrder> findByBusinessIdOrderByCreatedAtDesc(Long businessId);

    List<TailorOrder> findByBusinessIdAndCustomerIdOrderByCreatedAtDesc(Long businessId, Long customerId);

    Optional<TailorOrder> findByIdAndBusinessId(Long id, Long businessId);
}
