package com.shopzone.order.ports;

import com.shopzone.order.application.Ordering;
import com.shopzone.order.domain.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class OrderController {
  private final Ordering ordering;
  private final JdbcTemplate jdbc;

  public OrderController(Ordering ordering, JdbcTemplate jdbc) {
    this.ordering = ordering;
    this.jdbc = jdbc;
  }

  @PostMapping("/orders")
  @ResponseStatus(org.springframework.http.HttpStatus.ACCEPTED)
  public PurchaseOrder create(
      @Valid @RequestBody Ordering.Checkout r, @RequestHeader("Idempotency-Key") String key) {
    return ordering.checkout(r, key);
  }

  @GetMapping("/orders")
  public Page<PurchaseOrder> list(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return ordering.list(page, size);
  }

  @GetMapping("/orders/{id}")
  public PurchaseOrder get(@PathVariable UUID id) {
    return ordering.get(id);
  }

  @PostMapping("/orders/{id}/cancel")
  public PurchaseOrder cancel(@PathVariable UUID id) {
    return ordering.cancel(id);
  }

  public record State(OrderStatus status) {}

  @PatchMapping("/orders/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public PurchaseOrder advance(@PathVariable UUID id, @RequestBody State r) {
    return ordering.advance(id, r.status());
  }

  @GetMapping("/admin/statistics")
  @PreAuthorize("hasRole('ADMIN')")
  public Map<String, Object> statistics() {
    return jdbc.queryForMap(
        "select count(*) as total_orders,count(*) filter(where status='COMPLETED') as"
            + " completed_orders,coalesce(sum(total_amount) filter(where status='COMPLETED'),0) as"
            + " completed_revenue from orders");
  }
}
