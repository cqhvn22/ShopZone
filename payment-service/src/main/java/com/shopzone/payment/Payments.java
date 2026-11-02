package com.shopzone.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopzone.common.*;
import com.shopzone.persistence.EventStore;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Payments {
  private final JdbcTemplate jdbc;
  private final EventStore events;
  private final ObjectMapper json;
  private final String secret;

  public Payments(
      JdbcTemplate jdbc,
      EventStore events,
      ObjectMapper json,
      @Value("${shopzone.callback-secret}") String secret) {
    if (secret.length() < 32)
      throw new IllegalArgumentException(
          "PAYMENT_CALLBACK_SECRET must have at least 32 characters");
    this.jdbc = jdbc;
    this.events = events;
    this.json = json;
    this.secret = secret;
  }

  private void lock(UUID order) {
    jdbc.update(
        "insert into payment_locks(order_id,cancelled) values (?,false) on conflict do nothing",
        order);
    jdbc.queryForObject(
        "select cancelled from payment_locks where order_id=? for update", Boolean.class, order);
  }

  private boolean cancelled(UUID order) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "select cancelled from payment_locks where order_id=?", Boolean.class, order));
  }

  @Transactional
  public void request(OrderSnapshot o) {
    lock(o.orderId());
    if (cancelled(o.orderId())) return;
    String raw;
    try {
      raw = json.writeValueAsString(o);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
    int n =
        jdbc.update(
            "insert into"
                + " payments(id,order_id,customer_id,amount,currency,method,status,idempotency_key,snapshot)"
                + " values (?,?,?,?,?,?,'PENDING',?,?) on conflict(order_id) do nothing",
            UUID.randomUUID(),
            o.orderId(),
            o.customerId(),
            o.total(),
            o.currency(),
            o.paymentMethod(),
            o.orderId().toString(),
            raw);
    if (n == 1 && o.paymentMethod().equals("COD")) events.append("CodAuthorized", o, null);
  }

  @Transactional
  public void cancel(OrderSnapshot o) {
    lock(o.orderId());
    jdbc.update("update payment_locks set cancelled=true where order_id=?", o.orderId());
    var rows = jdbc.queryForList("select status from payments where order_id=?", o.orderId());
    if (rows.isEmpty()) return;
    String status = rows.get(0).get("status").toString();
    if (status.equals("SUCCESS")) refundLocked(o);
    else if (status.equals("PENDING"))
      jdbc.update(
          "update payments set status='CANCELLED',updated_at=current_timestamp where order_id=?",
          o.orderId());
  }

  @Transactional
  public void refund(OrderSnapshot o) {
    lock(o.orderId());
    refundLocked(o);
  }

  private void refundLocked(OrderSnapshot o) {
    int changed =
        jdbc.update(
            "update payments set status='REFUNDED',updated_at=current_timestamp where order_id=?"
                + " and status='SUCCESS'",
            o.orderId());
    if (changed == 1) {
      var payment =
          jdbc.queryForObject("select id from payments where order_id=?", UUID.class, o.orderId());
      jdbc.update(
          "insert into"
              + " payment_transactions(id,payment_id,provider,provider_transaction_id,transaction_type,amount,status)"
              + " values (?,?,'MOCK',?,'REFUND',?,'SUCCESS')",
          UUID.randomUUID(),
          payment,
          "refund-" + o.orderId(),
          o.total());
      events.append("PaymentRefunded", o, "Simulated refund");
    }
  }

  public record Callback(
      @NotNull UUID orderId,
      @NotBlank @Size(max = 200) @Pattern(regexp = "[A-Za-z0-9_-]+") String transactionId,
      @NotNull @DecimalMin("0") @Digits(integer = 16, fraction = 2) BigDecimal amount,
      @Pattern(regexp = "VND") @NotNull String currency,
      @Pattern(regexp = "SUCCESS|FAILED") @NotNull String status) {}

  @Transactional
  public Map<String, Object> callback(Callback c, String signature) {
    var expected =
        CallbackSigner.sign(
            secret, c.orderId(), c.transactionId(), c.amount(), c.currency(), c.status());
    if (!CallbackSigner.matches(expected, signature))
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid callback signature");
    lock(c.orderId());
    var p = get(c.orderId(), false);
    if (!p.get("method").equals("ONLINE"))
      throw ApiException.bad("COD does not accept online callbacks");
    if (((BigDecimal) p.get("amount")).compareTo(c.amount()) != 0
        || !p.get("currency").equals(c.currency()))
      throw ApiException.bad("Callback amount or currency mismatch");
    var prior =
        jdbc.queryForList(
            "select payment_id,status from payment_transactions where provider='MOCK' and"
                + " provider_transaction_id=?",
            c.transactionId());
    if (!prior.isEmpty()) {
      if (!prior.get(0).get("payment_id").equals(p.get("id"))
          || !prior.get(0).get("status").equals(c.status()))
        throw ApiException.conflict("Transaction reference already used");
      return get(c.orderId(), false);
    }
    String status = p.get("status").toString();
    if (!status.equals("PENDING") && !status.equals("CANCELLED"))
      throw ApiException.conflict("Payment already finalized");
    jdbc.update(
        "insert into"
            + " payment_transactions(id,payment_id,provider,provider_transaction_id,transaction_type,amount,status)"
            + " values (?,?,'MOCK',?,'CHARGE',?,?)",
        UUID.randomUUID(),
        p.get("id"),
        c.transactionId(),
        c.amount(),
        c.status());
    jdbc.update(
        "update payments set status=?,updated_at=current_timestamp where order_id=?",
        c.status(),
        c.orderId());
    var snapshot = read(p.get("snapshot").toString());
    if (cancelled(c.orderId()) && c.status().equals("SUCCESS")) refundLocked(snapshot);
    else
      events.append(
          c.status().equals("SUCCESS") ? "PaymentSucceeded" : "PaymentFailed",
          snapshot,
          "Mock provider callback");
    return get(c.orderId(), false);
  }

  @Transactional
  public void collectCod(OrderSnapshot o) {
    lock(o.orderId());
    int changed =
        jdbc.update(
            "update payments set status='SUCCESS',updated_at=current_timestamp where order_id=? and"
                + " method='COD' and status='PENDING'",
            o.orderId());
    if (changed == 1) {
      UUID payment =
          jdbc.queryForObject("select id from payments where order_id=?", UUID.class, o.orderId());
      jdbc.update(
          "insert into"
              + " payment_transactions(id,payment_id,provider,provider_transaction_id,transaction_type,amount,status)"
              + " values (?,?,'COD',?,'CHARGE',?,'SUCCESS')",
          UUID.randomUUID(),
          payment,
          "cod-" + o.orderId(),
          o.total());
    }
  }

  public Map<String, Object> get(UUID order, boolean checkOwner) {
    var rows = jdbc.queryForList("select * from payments where order_id=?", order);
    if (rows.isEmpty()) throw ApiException.missing();
    var p = rows.get(0);
    if (checkOwner) Caller.owner((UUID) p.get("customer_id"));
    return p;
  }

  private OrderSnapshot read(String raw) {
    try {
      return json.readValue(raw, OrderSnapshot.class);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
