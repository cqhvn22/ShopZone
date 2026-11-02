package com.shopzone.order.ports;

import com.shopzone.common.*;
import com.shopzone.order.application.Ordering;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cart")
public class CartController {
  private final JdbcTemplate jdbc;
  private final Ordering ordering;

  public CartController(JdbcTemplate jdbc, Ordering ordering) {
    this.jdbc = jdbc;
    this.ordering = ordering;
  }

  public record Add(@NotBlank @Size(max = 100) String sku, @Min(1) @Max(10000) int quantity) {}

  public record Quantity(@Min(1) @Max(10000) int quantity) {}

  @GetMapping
  public List<Map<String, Object>> get() {
    return jdbc.queryForList(
        "select i.id,i.product_id,i.sku,i.quantity from cart_items i join carts c on i.cart_id=c.id"
            + " where c.customer_id=? order by i.sku",
        Caller.id());
  }

  @PostMapping("/items")
  @Transactional
  public List<Map<String, Object>> add(@Valid @RequestBody Add r) {
    var quote = ordering.quote(r.sku());
    jdbc.update(
        "insert into carts(id,customer_id) values (?,?) on conflict(customer_id) do nothing",
        UUID.randomUUID(),
        Caller.id());
    UUID cart =
        jdbc.queryForObject(
            "select id from carts where customer_id=? for update", UUID.class, Caller.id());
    jdbc.update(
        "insert into cart_items(id,cart_id,product_id,sku,quantity) values (?,?,?,?,?) on"
            + " conflict(cart_id,sku) do update set quantity=cart_items.quantity+excluded.quantity",
        UUID.randomUUID(),
        cart,
        quote.productId(),
        r.sku(),
        r.quantity());
    return get();
  }

  @PatchMapping("/items/{id}")
  public void update(@PathVariable UUID id, @Valid @RequestBody Quantity r) {
    if (jdbc.update(
            "update cart_items set quantity=? where id=? and cart_id in (select id from carts where"
                + " customer_id=?)",
            r.quantity(),
            id,
            Caller.id())
        != 1) throw ApiException.missing();
  }

  @DeleteMapping("/items/{id}")
  public void remove(@PathVariable UUID id) {
    if (jdbc.update(
            "delete from cart_items where id=? and cart_id in (select id from carts where"
                + " customer_id=?)",
            id,
            Caller.id())
        != 1) throw ApiException.missing();
  }
}
