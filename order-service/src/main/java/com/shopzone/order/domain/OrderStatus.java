package com.shopzone.order.domain;

import com.shopzone.common.ApiException;

public enum OrderStatus {
  PENDING,
  RESERVED,
  PAID,
  CONFIRMED,
  SHIPPING,
  COMPLETED,
  CANCELLED;

  public boolean cancellable() {
    return this == PENDING || this == RESERVED;
  }

  public void requireTransition(OrderStatus next) {
    boolean allowed =
        switch (this) {
          case PENDING -> next == RESERVED || next == CANCELLED;
          case RESERVED -> next == PAID || next == CONFIRMED || next == CANCELLED;
          case PAID, CONFIRMED -> next == SHIPPING;
          case SHIPPING -> next == COMPLETED;
          default -> false;
        };
    if (!allowed) throw ApiException.conflict("Invalid order transition: " + this + " -> " + next);
  }
}
