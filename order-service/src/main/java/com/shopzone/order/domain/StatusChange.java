package com.shopzone.order.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Embeddable
public class StatusChange {
  public String oldStatus, newStatus, reason;
  public Instant changedAt;

  public StatusChange() {}

  public StatusChange(String oldStatus, String newStatus, String reason) {
    this.oldStatus = oldStatus;
    this.newStatus = newStatus;
    this.reason = reason;
    this.changedAt = Instant.now();
  }
}
