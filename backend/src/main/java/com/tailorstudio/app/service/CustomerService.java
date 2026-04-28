package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.Customer;
import com.tailorstudio.app.domain.MeasurementUnit;
import com.tailorstudio.app.domain.TailorOrder;
import com.tailorstudio.app.repo.BusinessRepository;
import com.tailorstudio.app.repo.CustomerRepository;
import com.tailorstudio.app.repo.TailorOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final BusinessRepository businessRepository;
    private final TailorOrderRepository tailorOrderRepository;

    public CustomerService(
            CustomerRepository customerRepository,
            BusinessRepository businessRepository,
            TailorOrderRepository tailorOrderRepository) {
        this.customerRepository = customerRepository;
        this.businessRepository = businessRepository;
        this.tailorOrderRepository = tailorOrderRepository;
    }

    @Transactional(readOnly = true)
    public List<Customer> list(Long businessId, String query) {
        if (query == null || query.isBlank()) {
            return customerRepository.findByBusiness_IdOrderByNameAsc(businessId);
        }
        return customerRepository.search(businessId, query.trim());
    }

    @Transactional(readOnly = true)
    public Customer get(Long businessId, Long customerId) {
        Customer c = customerRepository.findById(customerId).orElseThrow();
        if (!c.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("Not found");
        }
        return c;
    }

    @Transactional
    public Customer create(Long businessId, String name, String phone, String address, MeasurementUnit preferredUnit) {
        var business = businessRepository.findById(businessId).orElseThrow();
        Customer c = new Customer();
        c.setBusiness(business);
        c.setName(name);
        c.setPhone(phone);
        c.setAddress(address);
        if (preferredUnit != null) {
            c.setPreferredUnit(preferredUnit);
        }
        return customerRepository.save(c);
    }

    @Transactional
    public Customer update(Long businessId, Long customerId, String name, String phone, String address, MeasurementUnit preferredUnit) {
        Customer c = get(businessId, customerId);
        c.setName(name);
        c.setPhone(phone);
        c.setAddress(address);
        if (preferredUnit != null) {
            c.setPreferredUnit(preferredUnit);
        }
        return customerRepository.save(c);
    }

    @Transactional(readOnly = true)
    public List<TailorOrder> orderHistory(Long businessId, Long customerId) {
        get(businessId, customerId);
        return tailorOrderRepository.findByBusiness_IdAndCustomer_IdOrderByCreatedAtDesc(businessId, customerId);
    }
}
