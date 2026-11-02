package com.shopzone.payment;

import com.shopzone.persistence.EventStore;
import java.util.Set;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class PaymentEvents {
  private final EventStore events;
  private final Payments payments;

  public PaymentEvents(EventStore events, Payments payments) {
    this.events = events;
    this.payments = payments;
  }

  @KafkaListener(topics = "shopzone.events")
  @Transactional
  public void receive(String raw) {
    var e = events.read(raw);
    if (!Set.of("PaymentRequested", "OrderCancelled", "RefundRequested", "OrderCompleted")
            .contains(e.type())
        || !events.first(e.eventId())) return;
    switch (e.type()) {
      case "PaymentRequested" -> payments.request(e.order());
      case "OrderCancelled" -> payments.cancel(e.order());
      case "RefundRequested" -> payments.refund(e.order());
      case "OrderCompleted" -> payments.collectCod(e.order());
      default -> {}
    }
  }
}
