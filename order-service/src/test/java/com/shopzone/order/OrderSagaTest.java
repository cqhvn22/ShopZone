package com.shopzone.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.shopzone.common.*;
import com.shopzone.order.application.*;
import com.shopzone.order.domain.*;
import com.shopzone.order.infrastructure.OrderRepository;
import com.shopzone.persistence.EventStore;
import java.util.*;
import org.junit.jupiter.api.*;

class OrderSagaTest {
  final OrderRepository repo = mock(OrderRepository.class);
  final EventStore events = mock(EventStore.class);
  final Ordering ordering = mock(Ordering.class);
  final OrderEvents listener = new OrderEvents(repo, events, ordering);
  final PurchaseOrder order = new PurchaseOrder();

  @BeforeEach
  void init() {
    when(repo.locked(order.id)).thenReturn(Optional.of(order));
    when(events.first(any())).thenReturn(true);
  }

  void send(String type) {
    var e = ShopEvent.of(type, order.snapshot(), null);
    when(events.read(type)).thenReturn(e);
    listener.receive(type);
  }

  @Test
  void stockReservationTriggersPaymentOnlyOnce() {
    send("StockReserved");
    send("StockReserved");
    assertEquals(OrderStatus.RESERVED, order.status);
    verify(events, times(1)).append(eq("PaymentRequested"), any(), isNull());
  }

  @Test
  void latePaymentAfterCancellationRequestsRefund() {
    order.transition(OrderStatus.CANCELLED, "cancel");
    send("PaymentSucceeded");
    assertEquals(OrderStatus.CANCELLED, order.status);
    verify(events).append(eq("RefundRequested"), any(), anyString());
  }

  @Test
  void duplicateEventIsIgnored() {
    var e = ShopEvent.of("StockReserved", order.snapshot(), null);
    when(events.read("raw")).thenReturn(e);
    when(events.first(e.eventId())).thenReturn(false);
    listener.receive("raw");
    assertEquals(OrderStatus.PENDING, order.status);
    verify(repo, never()).locked(any());
  }

  @Test
  void codAuthorizationConfirmsWithoutPaidState() {
    order.transition(OrderStatus.RESERVED, "reserve");
    send("CodAuthorized");
    assertEquals(OrderStatus.CONFIRMED, order.status);
    verify(events).append(eq("OrderConfirmed"), any(), isNull());
  }
}
