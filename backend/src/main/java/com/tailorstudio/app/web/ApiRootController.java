package com.tailorstudio.app.web;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping(value = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
public class ApiRootController {

    @GetMapping({"", "/"})
    public Map<String, String> welcome() {
        return Map.of("message", "Welcome to Tailor Studio Backend");
    }
}
