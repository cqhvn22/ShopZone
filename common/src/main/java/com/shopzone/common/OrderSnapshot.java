package com.shopzone.common;

import java.math.BigDecimal;
import java.util.*;

public record OrderSnapshot(
    UUID orderId,
    UUID customerId,
    String email,
    String paymentMethod,
    BigDecimal total,
    String currency,
    List<Line> items) {
  public record Line(
      String productId, String sku, String name, BigDecimal unitPrice, int quantity) {}
}
