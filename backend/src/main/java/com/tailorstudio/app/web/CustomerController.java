package com.tailorstudio.app.web;

import com.tailorstudio.app.domain.Customer;
import com.tailorstudio.app.domain.MeasurementUnit;
import com.tailorstudio.app.domain.TailorOrder;
import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.CustomerService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CurrentUserService currentUserService;
    private final CustomerService customerService;

    public CustomerController(CurrentUserService currentUserService, CustomerService customerService) {
        this.currentUserService = currentUserService;
        this.customerService = customerService;
    }

    @GetMapping
    public List<Customer> list(@RequestParam(required = false) String q) {
        var u = currentUserService.requireUser();
        return customerService.list(u.getBusinessId(), q);
    }

    @GetMapping("/{id}")
    public Customer get(@PathVariable Long id) {
        var u = currentUserService.requireUser();
        return customerService.get(u.getBusinessId(), id);
    }

    @GetMapping("/{id}/orders")
    public List<TailorOrder> orderHistory(@PathVariable Long id) {
        var u = currentUserService.requireUser();
        return customerService.orderHistory(u.getBusinessId(), id);
    }

    public record CustomerWriteRequest(
            @NotBlank String name,
            @NotBlank String phone,
            String address,
            String preferredUnit) {}

    @PostMapping
    public Customer create(@Valid @RequestBody CustomerWriteRequest req) {
        var u = currentUserService.requireUser();
        return customerService.create(
                u.getBusinessId(), req.name(), req.phone(), req.address(), parseUnit(req.preferredUnit()));
    }

    @PutMapping("/{id}")
    public Customer update(@PathVariable Long id, @Valid @RequestBody CustomerWriteRequest req) {
        var u = currentUserService.requireUser();
        return customerService.update(
                u.getBusinessId(), id, req.name(), req.phone(), req.address(), parseUnit(req.preferredUnit()));
    }

    private static MeasurementUnit parseUnit(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return MeasurementUnit.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("preferredUnit must be INCH or CM");
        }
    }
}
