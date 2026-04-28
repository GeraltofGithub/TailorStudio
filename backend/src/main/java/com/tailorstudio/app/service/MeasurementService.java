package com.tailorstudio.app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tailorstudio.app.domain.GarmentType;
import com.tailorstudio.app.domain.Measurement;
import com.tailorstudio.app.domain.MeasurementUnit;
import com.tailorstudio.app.dto.MeasurementResponse;
import com.tailorstudio.app.dto.MeasurementWriteRequest;
import com.tailorstudio.app.repo.CustomerRepository;
import com.tailorstudio.app.repo.MeasurementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Service
public class MeasurementService {

    private final MeasurementRepository measurementRepository;
    private final CustomerRepository customerRepository;
    private final ObjectMapper objectMapper;

    public MeasurementService(
            MeasurementRepository measurementRepository,
            CustomerRepository customerRepository,
            ObjectMapper objectMapper) {
        this.measurementRepository = measurementRepository;
        this.customerRepository = customerRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<MeasurementResponse> listForCustomer(Long businessId, Long customerId) {
        verifyCustomer(businessId, customerId);
        var customer = customerRepository.findById(customerId).orElseThrow();
        MeasurementUnit def = customer.getPreferredUnit();
        return measurementRepository.findByCustomer_IdOrderByGarmentTypeAsc(customerId).stream()
                .map(m -> toResponse(m, def))
                .toList();
    }

    @Transactional(readOnly = true)
    public MeasurementResponse getForGarment(Long businessId, Long customerId, GarmentType type) {
        verifyCustomer(businessId, customerId);
        var customer = customerRepository.findById(customerId).orElseThrow();
        MeasurementUnit def = customer.getPreferredUnit();
        return measurementRepository
                .findByCustomer_IdAndGarmentType(customerId, type)
                .map(m -> toResponse(m, def))
                .orElseGet(() -> emptyResponse(type, def));
    }

    private MeasurementResponse emptyResponse(GarmentType type, MeasurementUnit def) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("unit", def.name());
            root.set("values", objectMapper.createObjectNode());
            return new MeasurementResponse(null, type, objectMapper.writeValueAsString(root), null);
        } catch (JsonProcessingException e) {
            return new MeasurementResponse(null, type, "{\"unit\":\"" + def.name() + "\",\"values\":{}}", null);
        }
    }

    private MeasurementResponse toResponse(Measurement m, MeasurementUnit defaultUnit) {
        String json = normalizeStoredJson(m.getDataJson(), defaultUnit);
        return new MeasurementResponse(m.getId(), m.getGarmentType(), json, m.getUpdatedAt());
    }

    @Transactional
    public Measurement save(Long businessId, Long customerId, GarmentType garmentType, MeasurementWriteRequest req)
            throws JsonProcessingException {
        var customer = customerRepository.findById(customerId).orElseThrow();
        if (!customer.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("Not found");
        }
        MeasurementUnit unit;
        try {
            unit = MeasurementUnit.valueOf(req.unit().trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("unit must be INCH or CM");
        }
        Map<String, String> values = req.values() != null ? new HashMap<>(req.values()) : new HashMap<>();
        String json = wrapJson(unit, values);

        Measurement m = measurementRepository.findByCustomer_IdAndGarmentType(customerId, garmentType)
                .orElseGet(Measurement::new);
        if (m.getId() == null) {
            m.setCustomer(customer);
            m.setGarmentType(garmentType);
        }
        m.setDataJson(json);
        m.setUpdatedAt(Instant.now());
        return measurementRepository.save(m);
    }

    private String wrapJson(MeasurementUnit unit, Map<String, String> values) throws JsonProcessingException {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("unit", unit.name());
        root.set("values", objectMapper.valueToTree(values));
        return objectMapper.writeValueAsString(root);
    }

    /** Normalize legacy flat JSON or missing unit into canonical string. */
    public String normalizeStoredJson(String raw, MeasurementUnit defaultUnit) {
        if (raw == null || raw.isBlank()) {
            try {
                return wrapJson(defaultUnit, new HashMap<>());
            } catch (JsonProcessingException e) {
                return "{\"unit\":\"INCH\",\"values\":{}}";
            }
        }
        try {
            JsonNode n = objectMapper.readTree(raw);
            if (n.has("unit") && n.has("values") && n.get("values").isObject()) {
                return objectMapper.writeValueAsString(n);
            }
            Map<String, String> flat = new HashMap<>();
            Iterator<String> it = n.fieldNames();
            while (it.hasNext()) {
                String k = it.next();
                if ("unit".equals(k)) {
                    continue;
                }
                JsonNode v = n.get(k);
                if (v != null && !v.isObject() && !v.isArray()) {
                    flat.put(k, v.asText());
                }
            }
            return wrapJson(defaultUnit, flat);
        } catch (Exception e) {
            return "{\"unit\":\"" + defaultUnit.name() + "\",\"values\":{}}";
        }
    }

    private void verifyCustomer(Long businessId, Long customerId) {
        var c = customerRepository.findById(customerId).orElseThrow();
        if (!c.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("Not found");
        }
    }
}
