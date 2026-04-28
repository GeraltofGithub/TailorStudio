package com.tailorstudio.app;

import com.tailorstudio.app.payment.PhonePeProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(PhonePeProperties.class)
public class TailorStudioApplication {

    public static void main(String[] args) {
        SpringApplication.run(TailorStudioApplication.class, args);
    }
}
