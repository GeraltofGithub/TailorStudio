package com.tailorstudio.app.web;

import com.tailorstudio.app.repo.UserRepository;
import com.tailorstudio.app.security.CurrentUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/team")
public class TeamController {

    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;

    public TeamController(CurrentUserService currentUserService, UserRepository userRepository) {
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        var u = currentUserService.requireUser();
        return userRepository.findByBusiness_IdOrderByCreatedAtAsc(u.getBusinessId()).stream()
                .map(user -> {
                    String role = user.getRole().name();
                    return Map.<String, Object>of(
                            "id", user.getId(),
                            "fullName", user.getFullName(),
                            "email", user.getEmail(),
                            "role", role,
                            "createdAt", user.getCreatedAt().toString());
                })
                .toList();
    }
}
