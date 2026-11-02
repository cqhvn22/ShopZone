package com.shopzone.auth;

import com.shopzone.common.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final UserRepository users;
  private final JwtEncoder encoder;
  private final String issuer;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);

  public AuthService(
      UserRepository users, JwtEncoder encoder, @Value("${shopzone.issuer}") String issuer) {
    this.users = users;
    this.encoder = encoder;
    this.issuer = issuer;
  }

  @Transactional
  public UserAccount register(String email, String password, String fullName, String phone) {
    if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw ApiException.bad("Password must be at most 72 UTF-8 bytes");
    String normalized = email.trim().toLowerCase(Locale.ROOT);
    if (users.findByEmail(normalized).isPresent())
      throw ApiException.conflict("Email already registered");
    var u = new UserAccount();
    u.email = normalized;
    u.fullName = fullName;
    u.phone = phone;
    u.passwordHash = passwords.encode(password);
    u.roles.add("CUSTOMER");
    return users.saveAndFlush(u);
  }

  public Map<String, Object> login(String email, String password) {
    var u =
        users
            .findByEmail(email.trim().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    if (!passwords.matches(password, u.passwordHash) || !u.status.equals("ACTIVE"))
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials or inactive account");
    var now = Instant.now();
    var claims =
        JwtClaimsSet.builder()
            .issuer(issuer)
            .subject(u.id.toString())
            .issuedAt(now)
            .expiresAt(now.plusSeconds(900))
            .claim("email", u.email)
            .claim("roles", u.roles)
            .build();
    String token =
        encoder
            .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue();
    return Map.of("accessToken", token, "tokenType", "Bearer", "expiresIn", 900, "user", u);
  }

  @Transactional
  public void bootstrap(String email, String password) {
    if (email.isBlank() || password.isBlank()) return;
    if (password.length() < 12)
      throw new IllegalArgumentException("ADMIN_PASSWORD must contain at least 12 characters");
    if (users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).isEmpty()) {
      var u = register(email, password, "Administrator", null);
      u.roles.add("ADMIN");
      users.save(u);
    }
  }
}
