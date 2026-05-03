package com.tailorstudio.app.web;

import com.tailorstudio.app.security.CurrentUserService;
import com.tailorstudio.app.service.MePayloadService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final CurrentUserService currentUserService;
    private final MePayloadService mePayloadService;

    public MeController(CurrentUserService currentUserService, MePayloadService mePayloadService) {
        this.currentUserService = currentUserService;
        this.mePayloadService = mePayloadService;
    }

    @GetMapping
    public Map<String, Object> me() {
        return mePayloadService.buildFor(currentUserService.requireUser());
    }
}
