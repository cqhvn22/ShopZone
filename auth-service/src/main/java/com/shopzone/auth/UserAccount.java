package com.shopzone.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "users")
public class UserAccount {
  @Id public UUID id = UUID.randomUUID();

  @Column(nullable = false, unique = true)
  public String email;

  @JsonIgnore
  @Column(name = "password_hash", nullable = false)
  public String passwordHash;

  @Column(nullable = false)
  public String fullName;

  public String phone;

  @Column(nullable = false)
  public String status = "ACTIVE";

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
  @Column(name = "role")
  public Set<String> roles = new HashSet<>();

  @Column(nullable = false)
  public Instant createdAt = Instant.now();

  public UserAccount() {}
}
