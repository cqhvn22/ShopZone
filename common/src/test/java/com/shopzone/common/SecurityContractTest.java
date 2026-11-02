package com.shopzone.common;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;

@WebMvcTest(
    controllers = SecurityContractTest.Probe.class,
    properties = {
      "shopzone.jwt-secret=test-key-with-more-than-32-characters",
      "shopzone.issuer=shopzone"
    })
@Import({SecurityConfig.class, SecurityContractTest.Probe.class})
class SecurityContractTest {
  @SpringBootConfiguration
  @EnableAutoConfiguration
  static class Config {}

  @RestController
  static class Probe {
    @GetMapping("/api/v1/products")
    String products() {
      return "ok";
    }

    @PostMapping("/api/v1/products")
    @PreAuthorize("hasRole('ADMIN')")
    String create() {
      return "ok";
    }

    @GetMapping("/api/v1/orders")
    String orders() {
      return "ok";
    }
  }

  @Autowired MockMvc mvc;

  @Test
  void guestsCanBrowse() throws Exception {
    mvc.perform(get("/api/v1/products")).andExpect(status().isOk());
  }

  @Test
  void guestsCannotReadOrders() throws Exception {
    mvc.perform(get("/api/v1/orders")).andExpect(status().isUnauthorized());
  }

  @Test
  void customerCannotWriteProducts() throws Exception {
    mvc.perform(
            post("/api/v1/products")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void administratorCanWriteProducts() throws Exception {
    mvc.perform(
            post("/api/v1/products")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
        .andExpect(status().isOk());
  }

  @Test
  void internalEndpointsAreNeverPublic() throws Exception {
    mvc.perform(
            get("/internal/reserve")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
        .andExpect(status().isForbidden());
  }
}
