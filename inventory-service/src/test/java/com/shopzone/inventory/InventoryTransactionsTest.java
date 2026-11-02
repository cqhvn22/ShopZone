package com.shopzone.inventory;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopzone.common.*;
import com.shopzone.persistence.EventStore;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.jdbc.datasource.init.*;
import org.springframework.transaction.support.TransactionTemplate;

class InventoryTransactionsTest {
  JdbcTemplate jdbc;
  TransactionTemplate tx;
  EventStore events;
  InventoryFlow flow;
  InventoryEvents listener;
  ObjectMapper json;

  @BeforeEach
  void init() throws Exception {
    var ds =
        new DriverManagerDataSource(
            "jdbc:h2:mem:"
                + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=20000",
            "sa",
            "");
    jdbc = new JdbcTemplate(ds);
    tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
    // H2 has equivalent timestamp types but no PostgreSQL partial indexes.
    String schema =
        new String(
                new ClassPathResource("db/migration/V1__event_store.sql")
                    .getInputStream()
                    .readAllBytes(),
                java.nio.charset.StandardCharsets.UTF_8)
            .replace("TIMESTAMPTZ", "TIMESTAMP WITH TIME ZONE")
            .replace(" WHERE published_at IS NULL", "");
    new ResourceDatabasePopulator(
            new org.springframework.core.io.ByteArrayResource(
                schema.getBytes(java.nio.charset.StandardCharsets.UTF_8)),
            new ClassPathResource("db/migration/V2__inventory.sql"))
        .execute(ds);
    json = new ObjectMapper().findAndRegisterModules();
    events = new EventStore(jdbc, json);
    flow = new InventoryFlow(jdbc, events);
    listener = new InventoryEvents(events, flow);
    jdbc.update("insert into stock_items(sku,on_hand,reserved,version) values ('PHONE',10,0,0)");
  }

  OrderSnapshot order(int quantity) {
    return new OrderSnapshot(
        UUID.randomUUID(),
        UUID.randomUUID(),
        "buyer@example.test",
        "ONLINE",
        BigDecimal.TEN,
        "VND",
        List.of(new OrderSnapshot.Line("p", "PHONE", "Phone", BigDecimal.TEN, quantity)));
  }

  int value(String field) {
    return jdbc.queryForObject(
        "select " + field + " from stock_items where sku='PHONE'", Integer.class);
  }

  void reserve(OrderSnapshot o) {
    tx.executeWithoutResult(s -> flow.reserve(o));
  }

  @Test
  void insufficientStockDoesNotReserveAnything() {
    reserve(order(15));
    assertEquals(0, value("reserved"));
    assertEquals(10, value("on_hand"));
    assertEquals(
        "StockReservationFailed",
        jdbc.queryForObject("select event_type from outbox_events", String.class));
  }

  @Test
  void duplicateReservationAndCommitAreIdempotent() {
    var o = order(2);
    reserve(o);
    reserve(o);
    assertEquals(2, value("reserved"));
    tx.executeWithoutResult(s -> flow.commit(o));
    tx.executeWithoutResult(s -> flow.commit(o));
    tx.executeWithoutResult(s -> flow.release(o));
    assertEquals(0, value("reserved"));
    assertEquals(8, value("on_hand"));
  }

  @Test
  void cancellationBeforeCreationPreventsLateReservation() {
    var o = order(2);
    tx.executeWithoutResult(s -> flow.release(o));
    reserve(o);
    assertEquals(0, value("reserved"));
    assertEquals(0, jdbc.queryForObject("select count(*) from stock_reservations", Integer.class));
  }

  @Test
  void paymentFailureCompensationReleasesOnce() {
    var o = order(2);
    reserve(o);
    tx.executeWithoutResult(s -> flow.release(o));
    tx.executeWithoutResult(s -> flow.release(o));
    assertEquals(10, value("on_hand"));
    assertEquals(0, value("reserved"));
  }

  @Test
  void concurrentBuyersCannotOversell() throws Exception {
    var start = new CountDownLatch(1);
    var executor = Executors.newFixedThreadPool(12);
    try {
      var tasks = new ArrayList<Future<?>>();
      for (int i = 0; i < 20; i++)
        tasks.add(
            executor.submit(
                () -> {
                  try {
                    start.await();
                    reserve(order(1));
                  } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(e);
                  }
                }));
      start.countDown();
      for (var f : tasks) f.get(30, TimeUnit.SECONDS);
      assertEquals(10, value("reserved"));
      assertEquals(
          10,
          jdbc.queryForObject(
              "select count(*) from reservation_batches where status='RESERVED'", Integer.class));
      assertEquals(
          10,
          jdbc.queryForObject(
              "select count(*) from reservation_batches where status='FAILED'", Integer.class));
    } finally {
      executor.shutdownNow();
    }
  }

  @Test
  void processedEventAndBusinessChangeRollbackTogether() throws Exception {
    var e = ShopEvent.of("OrderCreated", order(2), null);
    String raw = json.writeValueAsString(e);
    assertThrows(
        RuntimeException.class,
        () ->
            tx.executeWithoutResult(
                s -> {
                  listener.receive(raw);
                  throw new RuntimeException("simulated crash before commit");
                }));
    assertEquals(0, value("reserved"));
    assertEquals(0, jdbc.queryForObject("select count(*) from processed_events", Integer.class));
    tx.executeWithoutResult(s -> listener.receive(raw));
    tx.executeWithoutResult(s -> listener.receive(raw));
    assertEquals(2, value("reserved"));
    assertEquals(1, jdbc.queryForObject("select count(*) from processed_events", Integer.class));
  }

  @Test
  void multiSkuFailureDoesNotLeavePartialReservation() {
    var o =
        new OrderSnapshot(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "buyer@test.local",
            "COD",
            BigDecimal.TEN,
            "VND",
            List.of(
                new OrderSnapshot.Line("p", "PHONE", "Phone", BigDecimal.TEN, 2),
                new OrderSnapshot.Line("p2", "MISSING", "Missing", BigDecimal.ONE, 1)));
    reserve(o);
    assertEquals(0, value("reserved"));
  }
}
