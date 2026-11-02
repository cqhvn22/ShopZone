package com.shopzone.auth;

import com.shopzone.common.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
  private final AuthService auth;
  private final UserRepository users;

  public AuthController(AuthService auth, UserRepository users) {
    this.auth = auth;
    this.users = users;
  }

  public record Register(
      @NotBlank @Email @Size(max = 255) String email,
      @NotBlank @Size(min = 12, max = 72) String password,
      @NotBlank @Size(max = 150) String fullName,
      @Size(max = 20) String phone) {}

  public record Login(@NotBlank @Email String email, @NotBlank @Size(max = 72) String password) {}

  public record UserStatus(@Pattern(regexp = "ACTIVE|LOCKED|DISABLED") @NotNull String status) {}

  @PostMapping("/auth/register")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public UserAccount register(@Valid @RequestBody Register r) {
    return auth.register(r.email(), r.password(), r.fullName(), r.phone());
  }

  @PostMapping("/auth/login")
  public Map<String, Object> login(@Valid @RequestBody Login r) {
    return auth.login(r.email(), r.password());
  }

  @GetMapping("/users/me")
  public UserAccount me() {
    return users.findById(Caller.id()).orElseThrow(ApiException::missing);
  }

  @GetMapping("/users")
  @PreAuthorize("hasRole('ADMIN')")
  public Page<UserAccount> list(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return users.findAll(
        PageRequest.of(
            Math.max(0, page),
            Math.min(100, Math.max(1, size)),
            Sort.by("createdAt").descending()));
  }

  @PatchMapping("/users/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  @Transactional
  public UserAccount status(@PathVariable UUID id, @Valid @RequestBody UserStatus r) {
    if (Caller.id().equals(id))
      throw ApiException.bad("Cannot lock your own administrator account");
    var u = users.findById(id).orElseThrow(ApiException::missing);
    u.status = r.status();
    return users.save(u);
  }
}
