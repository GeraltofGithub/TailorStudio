package com.tailorstudio.app.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.tailorstudio.app.domain.GarmentType;
import com.tailorstudio.app.domain.Measurement;
import com.tailorstudio.app.dto.MeasurementResponse;
import com.tailorstudio.app.dto.MeasurementWriteRequest;
import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.MeasurementService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customers/{customerId}/measurements")
public class MeasurementController {

    private final CurrentUserService currentUserService;
    private final MeasurementService measurementService;

    public MeasurementController(CurrentUserService currentUserService, MeasurementService measurementService) {
        this.currentUserService = currentUserService;
        this.measurementService = measurementService;
    }

    @GetMapping
    public List<MeasurementResponse> list(@PathVariable Long customerId) {
        var u = currentUserService.requireUser();
        return measurementService.listForCustomer(u.getBusinessId(), customerId);
    }

    @GetMapping("/{garment}")
    public MeasurementResponse get(@PathVariable Long customerId, @PathVariable GarmentType garment) {
        var u = currentUserService.requireUser();
        return measurementService.getForGarment(u.getBusinessId(), customerId, garment);
    }

    @PutMapping("/{garment}")
    public Measurement save(
            @PathVariable Long customerId,
            @PathVariable GarmentType garment,
            @Valid @RequestBody MeasurementWriteRequest data) throws JsonProcessingException {
        var u = currentUserService.requireUser();
        return measurementService.save(u.getBusinessId(), customerId, garment, data);
    }
}
