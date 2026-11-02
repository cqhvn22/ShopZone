package com.shopzone.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(
    scanBasePackages = {
      "com.shopzone.inventory",
      "com.shopzone.common",
      "com.shopzone.persistence"
    })
@EnableScheduling
public class InventoryApplication {
  public static void main(String[] args) {
    SpringApplication.run(InventoryApplication.class, args);
  }
}
