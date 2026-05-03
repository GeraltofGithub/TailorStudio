package com.tailorstudio.app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Bounded pool for {@code @Async} mail sends so bursts do not spawn unbounded threads.
 */
@Configuration
public class AsyncMailExecutorConfig {

    @Bean(name = "taskExecutor")
    public ThreadPoolTaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(1);
        ex.setMaxPoolSize(4);
        ex.setQueueCapacity(256);
        ex.setThreadNamePrefix("mail-async-");
        ex.initialize();
        return ex;
    }
}
