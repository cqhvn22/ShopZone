package com.shopzone.inventory;

import com.shopzone.persistence.EventStore;
import java.util.Set;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class InventoryEvents {
  private final EventStore events;
  private final InventoryFlow flow;

  public InventoryEvents(EventStore events, InventoryFlow flow) {
    this.events = events;
    this.flow = flow;
  }

  @KafkaListener(topics = "shopzone.events")
  @Transactional
  public void receive(String raw) {
    var e = events.read(raw);
    if (!Set.of("OrderCreated", "OrderCancelled", "OrderConfirmed").contains(e.type())
        || !events.first(e.eventId())) return;
    switch (e.type()) {
      case "OrderCreated" -> flow.reserve(e.order());
      case "OrderCancelled" -> flow.release(e.order());
      case "OrderConfirmed" -> flow.commit(e.order());
      default -> {}
    }
  }
}
