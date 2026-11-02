package com.shopzone.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
  private final AuthService auth;
  private final String email, password;

  public AdminBootstrap(
      AuthService auth,
      @Value("${shopzone.admin-email:}") String email,
      @Value("${shopzone.admin-password:}") String password) {
    this.auth = auth;
    this.email = email;
    this.password = password;
  }

  public void run(ApplicationArguments args) {
    auth.bootstrap(email, password);
  }
}
