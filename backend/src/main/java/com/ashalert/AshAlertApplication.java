package com.ashalert;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class AshAlertApplication {

    public static void main(String[] args) {
        SpringApplication.run(AshAlertApplication.class, args);
    }
}
