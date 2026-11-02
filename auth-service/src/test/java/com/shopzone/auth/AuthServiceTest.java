package com.shopzone.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.shopzone.common.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.oauth2.jwt.*;

class AuthServiceTest {
  final UserRepository users = mock(UserRepository.class);
  final JwtEncoder encoder = mock(JwtEncoder.class);
  final AuthService auth = new AuthService(users, encoder, "shopzone");

  @Test
  void normalizesEmailHashesPasswordAndGrantsCustomerOnly() {
    when(users.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    var u = auth.register("Buyer@Example.Test", "LongPassword123!", "Buyer", null);
    assertEquals("buyer@example.test", u.email);
    assertTrue(u.passwordHash.startsWith("$2"));
    assertNotEquals("LongPassword123!", u.passwordHash);
    assertEquals(Set.of("CUSTOMER"), u.roles);
  }

  @Test
  void duplicateNormalizedEmailReturnsConflict() {
    when(users.findByEmail("buyer@example.test")).thenReturn(Optional.of(new UserAccount()));
    var ex =
        assertThrows(
            ApiException.class,
            () -> auth.register("BUYER@example.test", "LongPassword123!", "Buyer", null));
    assertEquals(409, ex.status.value());
  }

  @Test
  void lockedAccountCannotLogin() {
    var u = new UserAccount();
    u.email = "buyer@test.local";
    u.passwordHash =
        new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4)
            .encode("LongPassword123!");
    u.status = "LOCKED";
    when(users.findByEmail(u.email)).thenReturn(Optional.of(u));
    assertThrows(ApiException.class, () -> auth.login(u.email, "LongPassword123!"));
    verifyNoInteractions(encoder);
  }
}
