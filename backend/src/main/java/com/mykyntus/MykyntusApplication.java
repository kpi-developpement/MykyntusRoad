package com.mykyntus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MykyntusApplication {

    public static void main(String[] args) {
        SpringApplication.run(MykyntusApplication.class, args);
    }
}
