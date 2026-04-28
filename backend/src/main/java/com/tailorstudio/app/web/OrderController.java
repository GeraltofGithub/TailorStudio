package com.tailorstudio.app.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.tailorstudio.app.domain.TailorOrder;
import com.tailorstudio.app.dto.OrderWriteRequest;
import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.OrderService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final CurrentUserService currentUserService;
    private final OrderService orderService;

    public OrderController(CurrentUserService currentUserService, OrderService orderService) {
        this.currentUserService = currentUserService;
        this.orderService = orderService;
    }

    @GetMapping
    public List<TailorOrder> list() {
        var u = currentUserService.requireUser();
        return orderService.list(u.getBusinessId());
    }

    @GetMapping("/{id}")
    public TailorOrder get(@PathVariable Long id) {
        var u = currentUserService.requireUser();
        return orderService.get(u.getBusinessId(), id);
    }

    @PostMapping
    public TailorOrder create(@RequestBody OrderWriteRequest req) throws JsonProcessingException {
        var u = currentUserService.requireUser();
        return orderService.create(u.getBusinessId(), req);
    }

    @PutMapping("/{id}")
    public TailorOrder update(@PathVariable Long id, @RequestBody OrderWriteRequest req) throws JsonProcessingException {
        var u = currentUserService.requireUser();
        return orderService.update(u.getBusinessId(), id, req);
    }
}
