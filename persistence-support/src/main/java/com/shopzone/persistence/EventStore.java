package com.shopzone.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopzone.common.*;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class EventStore {
  private final JdbcTemplate jdbc;
  private final ObjectMapper json;

  public EventStore(JdbcTemplate jdbc, ObjectMapper json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  public boolean first(UUID id) {
    return jdbc.update(
            "insert into processed_events(event_id) values (?) on conflict do nothing", id)
        == 1;
  }

  public void append(String type, OrderSnapshot order, String reason) {
    try {
      var e = ShopEvent.of(type, order, reason);
      jdbc.update(
          "insert into outbox_events(event_id,aggregate_id,event_type,payload) values (?,?,?,?)",
          e.eventId(),
          e.aggregateId(),
          type,
          json.writeValueAsString(e));
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
  }

  public ShopEvent read(String raw) {
    try {
      return json.readValue(raw, ShopEvent.class);
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid event", e);
    }
  }
}
