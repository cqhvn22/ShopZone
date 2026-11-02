package com.shopzone.persistence;

import java.util.concurrent.TimeUnit;
import org.slf4j.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OutboxPublisher {
  private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);
  private final JdbcTemplate jdbc;
  private final KafkaTemplate<String, String> kafka;

  public OutboxPublisher(JdbcTemplate jdbc, KafkaTemplate<String, String> kafka) {
    this.jdbc = jdbc;
    this.kafka = kafka;
  }

  @Scheduled(fixedDelayString = "${shopzone.outbox-delay:500}")
  @Transactional
  public void publish() {
    if (!Boolean.TRUE.equals(
        jdbc.queryForObject("select pg_try_advisory_xact_lock(726391)", Boolean.class))) return;
    var rows =
        jdbc.queryForList(
            "select sequence_id,aggregate_id,payload from outbox_events where published_at is null"
                + " order by sequence_id limit 50 for update");
    for (var r : rows) {
      try {
        kafka
            .send("shopzone.events", r.get("aggregate_id").toString(), r.get("payload").toString())
            .get(10, TimeUnit.SECONDS);
        jdbc.update(
            "update outbox_events set published_at=current_timestamp where sequence_id=?",
            r.get("sequence_id"));
      } catch (Exception e) {
        log.warn("Outbox publication will retry: {}", e.getClass().getSimpleName());
        break;
      }
    }
  }
}
