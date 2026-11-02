package com.shopzone.order.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.shopzone.common.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
    name = "orders",
    uniqueConstraints = @UniqueConstraint(columnNames = {"customer_id", "idempotency_key"}))
public class PurchaseOrder {
  @Id public UUID id = UUID.randomUUID();
  public UUID customerId;
  public String customerEmail;

  @Column(unique = true)
  public String orderCode = "SZ-" + id;

  @Column(precision = 18, scale = 2)
  public BigDecimal totalAmount = BigDecimal.ZERO;

  public String currency = "VND", paymentMethod;

  @Enumerated(EnumType.STRING)
  public OrderStatus status = OrderStatus.PENDING;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  public ShippingAddress shippingAddress;

  @JsonIgnore public String idempotencyKey;
  @JsonIgnore public String requestHash;
  public boolean stockCommitted;
  @Version public long version;
  public Instant createdAt = Instant.now(), updatedAt = createdAt;

  @ElementCollection
  @CollectionTable(name = "order_items", joinColumns = @JoinColumn(name = "order_id"))
  @OrderColumn(name = "line_number")
  public List<OrderItem> items = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "order_status_history", joinColumns = @JoinColumn(name = "order_id"))
  @OrderColumn(name = "entry_number")
  public List<StatusChange> history = new ArrayList<>();

  public PurchaseOrder() {}

  public void add(OrderSnapshot.Line quote, int quantity) {
    if (quantity <= 0) throw ApiException.bad("Quantity must be positive");
    if (quote.unitPrice().signum() < 0) throw ApiException.bad("Negative price");
    var item =
        new OrderItem(quote.productId(), quote.sku(), quote.name(), quote.unitPrice(), quantity);
    items.add(item);
    totalAmount = totalAmount.add(item.subtotal);
    if (totalAmount.precision() - totalAmount.scale() > 16)
      throw ApiException.bad("Order total is too large");
  }

  public void transition(OrderStatus next, String reason) {
    status.requireTransition(next);
    history.add(new StatusChange(status.name(), next.name(), reason));
    status = next;
    updatedAt = Instant.now();
  }

  public OrderSnapshot snapshot() {
    return new OrderSnapshot(
        id,
        customerId,
        customerEmail,
        paymentMethod,
        totalAmount,
        currency,
        items.stream()
            .map(
                i ->
                    new OrderSnapshot.Line(
                        i.productId, i.sku, i.productName, i.unitPrice, i.quantity))
            .toList());
  }
}
