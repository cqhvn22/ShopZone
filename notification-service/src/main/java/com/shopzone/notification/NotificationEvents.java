package com.shopzone.notification;

import com.shopzone.persistence.EventStore;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class NotificationEvents {
  private final EventStore events;
  private final JdbcTemplate jdbc;

  public NotificationEvents(EventStore events, JdbcTemplate jdbc) {
    this.events = events;
    this.jdbc = jdbc;
  }

  @KafkaListener(topics = "shopzone.events")
  @Transactional
  public void receive(String raw) {
    var e = events.read(raw);
    if (!Set.of(
                "OrderConfirmed",
                "OrderCancelled",
                "OrderShipped",
                "OrderCompleted",
                "PaymentRefunded")
            .contains(e.type())
        || !events.first(e.eventId())) return;
    for (String channel : List.of("IN_APP", "EMAIL"))
      jdbc.update(
          "insert into"
              + " notifications(id,customer_id,order_id,event_id,type,channel,recipient,subject,content,status)"
              + " values (?,?,?,?,?,?,?,?,?,?) on conflict(event_id,channel) do nothing",
          UUID.randomUUID(),
          e.order().customerId(),
          e.aggregateId(),
          e.eventId(),
          e.type(),
          channel,
          e.order().email(),
          "ShopZone: " + e.type(),
          "Order "
              + e.aggregateId()
              + ": "
              + e.type()
              + (e.reason() == null ? "" : " (" + e.reason() + ")"),
          channel.equals("IN_APP") ? "SENT" : "PENDING");
  }
}
