package com.shopzone.inventory;

import com.shopzone.common.*;
import com.shopzone.persistence.EventStore;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryFlow {
  private final JdbcTemplate jdbc;
  private final EventStore events;

  public InventoryFlow(JdbcTemplate jdbc, EventStore events) {
    this.jdbc = jdbc;
    this.events = events;
  }

  private String lock(UUID orderId) {
    jdbc.update(
        "insert into reservation_batches(order_id,status) values (?,'NEW') on conflict do nothing",
        orderId);
    return jdbc.queryForObject(
        "select status from reservation_batches where order_id=? for update",
        String.class,
        orderId);
  }

  @Transactional
  public void reserve(OrderSnapshot order) {
    if (!lock(order.orderId()).equals("NEW")) return;
    var lines =
        order.items().stream().sorted(Comparator.comparing(OrderSnapshot.Line::sku)).toList();
    boolean available = true;
    var seen = new HashSet<String>();
    for (var line : lines) {
      if (line.quantity() <= 0 || !seen.add(line.sku()))
        throw ApiException.bad("Invalid reservation items");
      var stock =
          jdbc.queryForList(
              "select on_hand,reserved from stock_items where sku=? for update", line.sku());
      if (stock.isEmpty()
          || ((Number) stock.get(0).get("on_hand")).longValue()
                  - ((Number) stock.get(0).get("reserved")).longValue()
              < line.quantity()) available = false;
    }
    if (!available) {
      jdbc.update(
          "update reservation_batches set status='FAILED' where order_id=?", order.orderId());
      events.append("StockReservationFailed", order, "Insufficient stock");
      return;
    }
    for (var line : lines) {
      int changed =
          jdbc.update(
              "update stock_items set reserved=reserved+?,version=version+1 where sku=? and"
                  + " on_hand-reserved>=?",
              line.quantity(),
              line.sku(),
              line.quantity());
      if (changed != 1) throw new IllegalStateException("Stock invariant violated");
      jdbc.update(
          "insert into stock_reservations(id,order_id,sku,quantity,status) values"
              + " (?,?,?,?,'RESERVED')",
          UUID.randomUUID(),
          order.orderId(),
          line.sku(),
          line.quantity());
    }
    jdbc.update(
        "update reservation_batches set status='RESERVED' where order_id=?", order.orderId());
    events.append("StockReserved", order, null);
  }

  @Transactional
  public void release(OrderSnapshot order) {
    String state = lock(order.orderId());
    if (state.equals("COMMITTED") || state.equals("RELEASED")) return;
    if (state.equals("RESERVED")) {
      for (var r : reservations(order.orderId())) {
        jdbc.update(
            "update stock_items set reserved=reserved-?,version=version+1 where sku=?",
            r.get("quantity"),
            r.get("sku"));
      }
      jdbc.update(
          "update stock_reservations set status='RELEASED' where order_id=? and status='RESERVED'",
          order.orderId());
    }
    jdbc.update(
        "update reservation_batches set status='RELEASED' where order_id=?", order.orderId());
  }

  @Transactional
  public void commit(OrderSnapshot order) {
    String state = lock(order.orderId());
    if (state.equals("COMMITTED")) return;
    if (!state.equals("RESERVED"))
      throw new IllegalStateException("Cannot commit reservation in state " + state);
    for (var r : reservations(order.orderId())) {
      jdbc.update(
          "update stock_items set on_hand=on_hand-?,reserved=reserved-?,version=version+1 where"
              + " sku=?",
          r.get("quantity"),
          r.get("quantity"),
          r.get("sku"));
    }
    jdbc.update(
        "update stock_reservations set status='COMMITTED' where order_id=? and status='RESERVED'",
        order.orderId());
    jdbc.update(
        "update reservation_batches set status='COMMITTED' where order_id=?", order.orderId());
    events.append("StockCommitted", order, null);
  }

  private List<Map<String, Object>> reservations(UUID orderId) {
    // Use the same Java SKU ordering as reserve(), regardless of database collation.
    return jdbc
        .queryForList("select sku,quantity from stock_reservations where order_id=?", orderId)
        .stream()
        .sorted(Comparator.comparing(row -> row.get("sku").toString()))
        .toList();
  }
}
