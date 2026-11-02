package com.shopzone.order.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Embeddable
public class OrderItem {
  public String productId, sku, productName;

  @Column(precision = 18, scale = 2)
  public BigDecimal unitPrice;

  public int quantity;

  @Column(precision = 18, scale = 2)
  public BigDecimal subtotal;

  public OrderItem() {}

  public OrderItem(String productId, String sku, String name, BigDecimal price, int quantity) {
    this.productId = productId;
    this.sku = sku;
    this.productName = name;
    this.unitPrice = price;
    this.quantity = quantity;
    this.subtotal = price.multiply(BigDecimal.valueOf(quantity));
  }
}
