package com.shopzone.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(
    scanBasePackages = {"com.shopzone.product", "com.shopzone.common", "com.shopzone.persistence"})
@EnableScheduling
public class ProductApplication {
  public static void main(String[] args) {
    SpringApplication.run(ProductApplication.class, args);
  }
}
