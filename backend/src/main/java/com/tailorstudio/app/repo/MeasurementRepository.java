package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.GarmentType;
import com.tailorstudio.app.domain.Measurement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MeasurementRepository extends MongoRepository<Measurement, Long> {

    List<Measurement> findByCustomerIdOrderByGarmentTypeAsc(Long customerId);

    Optional<Measurement> findByCustomerIdAndGarmentType(Long customerId, GarmentType garmentType);
}
