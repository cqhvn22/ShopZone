package com.shopzone.inventory;

import com.shopzone.common.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
  private final JdbcTemplate jdbc;

  public InventoryController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public record Stock(@Min(0) @Max(1000000000) int onHand) {}

  @GetMapping("/{sku}")
  public Map<String, Object> get(@PathVariable String sku) {
    var rows =
        jdbc.queryForList(
            "select sku,on_hand,reserved,on_hand-reserved as available,version from stock_items"
                + " where sku=?",
            sku);
    if (rows.isEmpty()) throw ApiException.missing();
    return rows.get(0);
  }

  @PutMapping("/{sku}")
  @PreAuthorize("hasRole('ADMIN')")
  public Map<String, Object> set(
      @PathVariable @Size(max = 100) String sku, @Valid @RequestBody Stock r) {
    int n =
        jdbc.update(
            "insert into stock_items(sku,on_hand,reserved,version) values (?,?,0,0) on"
                + " conflict(sku) do update set"
                + " on_hand=excluded.on_hand,version=stock_items.version+1 where"
                + " stock_items.reserved<=excluded.on_hand",
            sku,
            r.onHand());
    if (n != 1) throw ApiException.conflict("On-hand quantity cannot be below reserved quantity");
    return get(sku);
  }
}
