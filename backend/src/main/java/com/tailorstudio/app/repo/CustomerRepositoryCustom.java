package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.Customer;

import java.util.Collection;
import java.util.List;

public interface CustomerRepositoryCustom {
    List<Customer> search(Long businessId, String q);

    List<Customer> searchActive(Long businessId, String q);

    /** Id + display fields only — for order list joins without loading full customer docs. */
    List<Customer> findCardsByBusinessAndIds(Long businessId, Collection<Long> ids);
}

