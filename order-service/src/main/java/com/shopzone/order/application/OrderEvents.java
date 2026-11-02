package com.shopzone.order.application;

import com.shopzone.common.*;
import com.shopzone.order.domain.*;
import com.shopzone.order.infrastructure.OrderRepository;
import com.shopzone.persistence.EventStore;
import java.util.Set;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OrderEvents {
  private final OrderRepository orders;
  private final EventStore events;
  private final Ordering ordering;
  private static final Set<String> TYPES =
      Set.of(
          "StockReserved",
          "StockReservationFailed",
          "PaymentSucceeded",
          "PaymentFailed",
          "CodAuthorized",
          "StockCommitted");

  public OrderEvents(OrderRepository orders, EventStore events, Ordering ordering) {
    this.orders = orders;
    this.events = events;
    this.ordering = ordering;
  }

  @KafkaListener(topics = "shopzone.events")
  @Transactional
  public void receive(String raw) {
    var e = events.read(raw);
    if (!TYPES.contains(e.type()) || !events.first(e.eventId())) return;
    var o = orders.locked(e.aggregateId()).orElseThrow(ApiException::missing);
    switch (e.type()) {
      case "StockReserved" -> {
        if (o.status == OrderStatus.PENDING) {
          o.transition(OrderStatus.RESERVED, "Stock reserved");
          events.append("PaymentRequested", o.snapshot(), null);
        }
      }
      case "StockReservationFailed", "PaymentFailed" -> {
        if (o.status.cancellable()) ordering.cancel(o, e.reason());
      }
      case "PaymentSucceeded", "CodAuthorized" -> {
        if (o.status == OrderStatus.RESERVED) {
          o.transition(
              e.type().equals("CodAuthorized") ? OrderStatus.CONFIRMED : OrderStatus.PAID,
              e.type());
          events.append("OrderConfirmed", o.snapshot(), null);
        } else if (o.status == OrderStatus.CANCELLED && e.type().equals("PaymentSucceeded"))
          events.append("RefundRequested", o.snapshot(), "Payment raced with cancellation");
      }
      case "StockCommitted" -> o.stockCommitted = true;
      default -> {}
    }
  }
}
