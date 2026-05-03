package com.tailorstudio.app.web;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The browser UI is a separate SPA (Vercel). The API host should not serve legacy HTML or redirect to it.
 * Spring Security's formLogin still needs a "login page" URL for redirects; we expose a tiny JSON endpoint.
 */
@RestController
public class SpaAuthPagesController {

    @GetMapping("/login")
    public void loginPage(HttpServletResponse response) throws Exception {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"unauthorized\"}");
    }
}
