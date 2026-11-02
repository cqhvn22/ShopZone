package com.shopzone.order.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopzone.common.*;
import com.shopzone.order.domain.*;
import com.shopzone.order.infrastructure.OrderRepository;
import com.shopzone.persistence.EventStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.*;

@Service
public class Ordering {
  private final OrderRepository orders;
  private final EventStore events;
  private final RestClient catalog;
  private final ObjectMapper json;
  private final JdbcTemplate jdbc;

  public Ordering(
      OrderRepository orders,
      EventStore events,
      ObjectMapper json,
      JdbcTemplate jdbc,
      @Value("${shopzone.product-url}") String url) {
    this.orders = orders;
    this.events = events;
    this.json = json;
    this.jdbc = jdbc;
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(3000);
    factory.setReadTimeout(5000);
    this.catalog = RestClient.builder().baseUrl(url).requestFactory(factory).build();
  }

  public record Item(@NotBlank @Size(max = 100) String sku, @Min(1) @Max(10000) int quantity) {}

  public record Checkout(
      @NotEmpty @Size(max = 100) List<@NotNull @Valid Item> items,
      @NotNull @Pattern(regexp = "COD|ONLINE") String paymentMethod,
      @NotNull @Valid ShippingAddress shippingAddress) {}

  @Transactional
  public PurchaseOrder checkout(Checkout r, String key) {
    if (key == null || key.isBlank() || key.length() > 128)
      throw ApiException.bad("Idempotency-Key is required (1-128 characters)");
    // Serialize retries for the same customer/key before checking the unique constraint.
    jdbc.queryForObject(
        "select pg_advisory_xact_lock(hashtextextended(?,0))",
        Object.class,
        Caller.id() + ":" + key);
    String fingerprint = fingerprint(r);
    var existing = orders.findByCustomerIdAndIdempotencyKey(Caller.id(), key);
    if (existing.isPresent()) {
      if (!existing.get().requestHash.equals(fingerprint))
        throw ApiException.conflict("Idempotency-Key already used for different input");
      existing.get().items.size();
      existing.get().history.size();
      return existing.get();
    }
    var p = new PurchaseOrder();
    p.customerId = Caller.id();
    p.customerEmail = Caller.email();
    p.paymentMethod = r.paymentMethod();
    p.shippingAddress = r.shippingAddress();
    p.idempotencyKey = key;
    p.requestHash = fingerprint;
    var seen = new HashSet<String>();
    for (var i : r.items()) {
      if (!seen.add(i.sku())) throw ApiException.bad("Duplicate order SKU");
      p.add(quote(i.sku()), i.quantity());
    }
    p.history.add(new StatusChange(null, "PENDING", "Order created"));
    orders.saveAndFlush(p);
    events.append("OrderCreated", p.snapshot(), null);
    return p;
  }

  public OrderSnapshot.Line quote(String sku) {
    try {
      return catalog
          .get()
          .uri("/api/v1/products/sku/{sku}", sku)
          .retrieve()
          .body(OrderSnapshot.Line.class);
    } catch (HttpClientErrorException.NotFound e) {
      throw ApiException.bad("SKU unavailable: " + sku);
    } catch (RestClientException e) {
      throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Catalog unavailable; retry later");
    }
  }

  private String fingerprint(Checkout r) {
    try {
      return HexFormat.of()
          .formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(r)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  @Transactional(readOnly = true)
  public PurchaseOrder get(UUID id) {
    var o = orders.findById(id).orElseThrow(ApiException::missing);
    Caller.owner(o.customerId);
    o.items.size();
    o.history.size();
    return o;
  }

  @Transactional(readOnly = true)
  public Page<PurchaseOrder> list(int page, int size) {
    var paging =
        PageRequest.of(
            Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by("createdAt").descending());
    var result =
        Caller.admin() ? orders.findAll(paging) : orders.findByCustomerId(Caller.id(), paging);
    result.forEach(
        o -> {
          o.items.size();
          o.history.size();
        });
    return result;
  }

  @Transactional
  public PurchaseOrder cancel(UUID id) {
    var o = orders.locked(id).orElseThrow(ApiException::missing);
    Caller.owner(o.customerId);
    if (o.status == OrderStatus.CANCELLED) {
      o.items.size();
      o.history.size();
      return o;
    }
    if (!o.status.cancellable())
      throw ApiException.conflict(
          "Only PENDING or RESERVED orders can be cancelled; confirmed orders require a"
              + " return/refund workflow");
    cancel(o, "Customer cancellation");
    return o;
  }

  public void cancel(PurchaseOrder o, String reason) {
    o.transition(OrderStatus.CANCELLED, reason);
    events.append("OrderCancelled", o.snapshot(), reason);
  }

  @Transactional
  public PurchaseOrder advance(UUID id, OrderStatus next) {
    var o = orders.locked(id).orElseThrow(ApiException::missing);
    if (next != OrderStatus.SHIPPING && next != OrderStatus.COMPLETED)
      throw ApiException.bad("Admin may advance only to SHIPPING or COMPLETED");
    if (!o.stockCommitted) throw ApiException.conflict("Waiting for inventory confirmation");
    o.transition(next, "Administrator update");
    events.append(
        next == OrderStatus.SHIPPING ? "OrderShipped" : "OrderCompleted", o.snapshot(), null);
    return o;
  }
}
