package com.tailorstudio.app.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;

import static org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.cookies.same-site:${COOKIE_SAMESITE:lax}}")
    private String cookieSameSite;

    @Value("${app.cookies.secure:${COOKIE_SECURE:false}}")
    private boolean cookieSecure;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource) throws Exception {
        CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepo.setCookiePath("/");
        csrfRepo.setCookieCustomizer(c -> c
                .secure(cookieSecure)
                .sameSite(cookieSameSite));
        // Spring Security 6 defaults CsrfFilter to XorCsrfTokenRequestAttributeHandler; the cookie value is then
        // XOR-masked and no longer matches what JS reads and sends in X-XSRF-TOKEN. Use the plain handler so
        // CookieCsrfTokenRepository + fetch() headers work for same-origin SPA calls.
        CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();
        csrfHandler.setCsrfRequestAttributeName("_csrf");

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepo)
                        .csrfTokenRequestHandler(csrfHandler)
                        // Public signup APIs; form POST /login must work even when XSRF-TOKEN cookie is missing on first visit
                        .ignoringRequestMatchers(
                                antMatcher("/h2-console/**"),
                                antMatcher("/api/auth/**"),
                                antMatcher(HttpMethod.POST, "/login")))
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/login.html",
                                "/signup.html",
                                "/join.html",
                                "/css/**",
                                "/js/**",
                                "/assets/**",
                                "/api/auth/**",
                                "/h2-console/**").permitAll()
                        .requestMatchers("/app/**").authenticated()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .formLogin(form -> form
                        .loginPage("/login.html")
                        .loginProcessingUrl("/login")
                        .usernameParameter("username")
                        .passwordParameter("password")
                        .successHandler((request, response, authentication) -> response.sendRedirect(
                                request.getContextPath() + "/app/dashboard.html"))
                        .failureUrl("/login.html?error=1")
                        .permitAll())
                .logout(logout -> logout
                        .logoutRequestMatcher(new AntPathRequestMatcher("/logout", "POST"))
                        .logoutSuccessUrl("/index.html")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                        .permitAll())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            if (request.getRequestURI().startsWith("/api/")) {
                                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                                response.getWriter().write("{\"error\":\"unauthorized\"}");
                            } else {
                                response.sendRedirect("/login.html");
                            }
                        })
                        // AnonymousAuthenticationToken still has isAuthenticated()==true, so access denied
                        // used to surface as 403; send users to login (or 401 for API) instead.
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                            if (auth == null || auth instanceof AnonymousAuthenticationToken) {
                                if (request.getRequestURI().startsWith("/api/")) {
                                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                                    response.getWriter().write("{\"error\":\"unauthorized\"}");
                                } else {
                                    response.sendRedirect("/login.html");
                                }
                                return;
                            }
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.TEXT_PLAIN_VALUE);
                            response.getWriter().write("Forbidden");
                        }));

        // Expose CSRF token via response header for cross-origin SPAs (Vercel + Render).
        http.addFilterAfter(new CsrfHeaderFilter(), CsrfFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
