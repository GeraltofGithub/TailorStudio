package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.GarmentType;
import com.tailorstudio.app.domain.Measurement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeasurementRepository extends JpaRepository<Measurement, Long> {

    List<Measurement> findByCustomer_IdOrderByGarmentTypeAsc(Long customerId);

    Optional<Measurement> findByCustomer_IdAndGarmentType(Long customerId, GarmentType garmentType);
}
