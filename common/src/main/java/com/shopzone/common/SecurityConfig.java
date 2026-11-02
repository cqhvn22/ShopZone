package com.shopzone.common;

import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
  @Bean
  SecretKeySpec jwtKey(@Value("${shopzone.jwt-secret}") String secret) {
    if (secret.getBytes(StandardCharsets.UTF_8).length < 32)
      throw new IllegalArgumentException("JWT_SECRET must be at least 32 bytes");
    return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
  }

  @Bean
  JwtDecoder jwtDecoder(SecretKeySpec key, @Value("${shopzone.issuer}") String issuer) {
    var d = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    d.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
    return d;
  }

  @Bean
  JwtEncoder jwtEncoder(SecretKeySpec key) {
    return new NimbusJwtEncoder(new com.nimbusds.jose.jwk.source.ImmutableSecret<>(key));
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    var roles = new JwtGrantedAuthoritiesConverter();
    roles.setAuthoritiesClaimName("roles");
    roles.setAuthorityPrefix("ROLE_");
    var converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(roles);
    return http.csrf(c -> c.disable())
        .cors(c -> {})
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/actuator/health/**", "/api/v1/auth/**", "/api/v1/payments/callback")
                    .permitAll()
                    .requestMatchers(
                        org.springframework.http.HttpMethod.GET,
                        "/api/v1/products/**",
                        "/api/v1/categories/**")
                    .permitAll()
                    .requestMatchers("/internal/**")
                    .denyAll()
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(converter)))
        .build();
  }

  @Bean
  CorsConfigurationSource cors(
      @Value("${shopzone.cors-origins:http://localhost:5173}") String origins) {
    var c = new CorsConfiguration();
    c.setAllowedOrigins(Arrays.asList(origins.split(",")));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(
        List.of("Authorization", "Content-Type", "Idempotency-Key", "X-Payment-Signature"));
    var s = new UrlBasedCorsConfigurationSource();
    s.registerCorsConfiguration("/**", c);
    return s;
  }
}
