package com.shopzone.order.application;

import com.shopzone.order.domain.*;
import com.shopzone.order.infrastructure.OrderRepository;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class CheckoutExpiry {
  private final OrderRepository orders;
  private final Ordering ordering;
  private final TransactionTemplate tx;
  private final long minutes;

  public CheckoutExpiry(
      OrderRepository orders,
      Ordering ordering,
      TransactionTemplate tx,
      @Value("${shopzone.checkout-timeout-minutes:20}") long minutes) {
    this.orders = orders;
    this.ordering = ordering;
    this.tx = tx;
    this.minutes = minutes;
  }

  @Scheduled(fixedDelay = 30000)
  public void expire() {
    for (var id :
        orders.expired(
            List.of(OrderStatus.PENDING, OrderStatus.RESERVED),
            Instant.now().minusSeconds(minutes * 60),
            PageRequest.of(0, 100)))
      tx.executeWithoutResult(
          s ->
              orders
                  .locked(id)
                  .ifPresent(
                      o -> {
                        if (o.status.cancellable()) ordering.cancel(o, "Checkout expired");
                      }));
  }
}
