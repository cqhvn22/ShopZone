package com.shopzone.payment;

import jakarta.validation.Valid;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {
  private final Payments payments;

  public PaymentController(Payments payments) {
    this.payments = payments;
  }

  @GetMapping("/{orderId}")
  public Map<String, Object> get(@PathVariable UUID orderId) {
    var p = new LinkedHashMap<>(payments.get(orderId, true));
    p.remove("snapshot");
    return p;
  }

  @PostMapping("/callback")
  public Map<String, Object> callback(
      @Valid @RequestBody Payments.Callback r,
      @RequestHeader(value = "X-Payment-Signature", required = false) String signature) {
    var p = new LinkedHashMap<>(payments.callback(r, signature));
    p.remove("snapshot");
    return p;
  }
}
