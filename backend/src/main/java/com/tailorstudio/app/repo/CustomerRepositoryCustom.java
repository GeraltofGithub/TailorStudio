package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.Customer;

import java.util.List;

public interface CustomerRepositoryCustom {
    List<Customer> search(Long businessId, String q);

    List<Customer> searchActive(Long businessId, String q);
}

