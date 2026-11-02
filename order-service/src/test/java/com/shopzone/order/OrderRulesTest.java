package com.shopzone.order;

import static org.junit.jupiter.api.Assertions.*;

import com.shopzone.common.*;
import com.shopzone.order.domain.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class OrderRulesTest {
  @Test
  void totalUsesServerPriceSnapshot() {
    var o = new PurchaseOrder();
    o.add(new OrderSnapshot.Line("p", "SKU", "Phone", new BigDecimal("20000000.00"), 1), 2);
    assertEquals(new BigDecimal("40000000.00"), o.totalAmount);
    assertEquals(new BigDecimal("20000000.00"), o.snapshot().items().get(0).unitPrice());
  }

  @Test
  void rejectsZeroQuantity() {
    assertThrows(
        ApiException.class,
        () ->
            new PurchaseOrder()
                .add(new OrderSnapshot.Line("p", "sku", "Phone", BigDecimal.ONE, 1), 0));
  }

  @Test
  void cancelledOrderCannotShipOrComplete() {
    var o = new PurchaseOrder();
    o.transition(OrderStatus.CANCELLED, "cancel");
    assertThrows(ApiException.class, () -> o.transition(OrderStatus.SHIPPING, "invalid"));
    assertThrows(ApiException.class, () -> o.transition(OrderStatus.COMPLETED, "invalid"));
  }

  @Test
  void codIsConfirmedWithoutBecomingPaid() {
    var o = new PurchaseOrder();
    o.paymentMethod = "COD";
    o.transition(OrderStatus.RESERVED, "reserve");
    o.transition(OrderStatus.CONFIRMED, "COD");
    assertEquals(OrderStatus.CONFIRMED, o.status);
    assertFalse(o.status.cancellable());
    o.transition(OrderStatus.SHIPPING, "ship");
    o.transition(OrderStatus.COMPLETED, "delivered");
    assertEquals(4, o.history.size());
  }

  @Test
  void onlinePaidStateCanOnlyShip() {
    assertThrows(
        ApiException.class, () -> OrderStatus.PAID.requireTransition(OrderStatus.CANCELLED));
    assertThrows(
        ApiException.class, () -> OrderStatus.PAID.requireTransition(OrderStatus.COMPLETED));
    assertDoesNotThrow(() -> OrderStatus.PAID.requireTransition(OrderStatus.SHIPPING));
  }
}
