package com.shopzone.common;

import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public final class Caller {
  private Caller() {}

  public static UUID id() {
    return UUID.fromString(token().getToken().getSubject());
  }

  public static String email() {
    return token().getToken().getClaimAsString("email");
  }

  public static boolean admin() {
    return token().getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
  }

  public static void owner(UUID customer) {
    if (!admin() && !id().equals(customer)) throw ApiException.missing();
  }

  public static JwtAuthenticationToken token() {
    return (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
  }
}
