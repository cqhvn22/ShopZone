package com.shopzone.common;

import java.time.Instant;
import java.util.UUID;

public record ShopEvent(
    UUID eventId,
    String type,
    UUID aggregateId,
    Instant occurredAt,
    OrderSnapshot order,
    String reason) {
  public static ShopEvent of(String type, OrderSnapshot order, String reason) {
    return new ShopEvent(UUID.randomUUID(), type, order.orderId(), Instant.now(), order, reason);
  }
}
