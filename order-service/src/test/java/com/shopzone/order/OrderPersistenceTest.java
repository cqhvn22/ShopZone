package com.shopzone.order;

import static org.junit.jupiter.api.Assertions.*;

import com.shopzone.common.OrderSnapshot;
import com.shopzone.order.domain.*;
import com.shopzone.order.infrastructure.OrderRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;

@DataJpaTest(
    properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:order-mapping;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password="})
@org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase(
    replace=org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = OrderPersistenceTest.PersistenceConfig.class)
class OrderPersistenceTest {
  @Configuration
  @EntityScan(basePackageClasses = PurchaseOrder.class)
  @EnableJpaRepositories(basePackageClasses = OrderRepository.class)
  static class PersistenceConfig {}

  @Autowired OrderRepository orders;
  @Autowired EntityManager entityManager;

  @Test
  void persistsPriceAddressAndHistorySnapshots() {
    var order = new PurchaseOrder();
    order.customerId = UUID.randomUUID();
    order.customerEmail = "buyer@example.test";
    order.paymentMethod = "COD";
    order.idempotencyKey = "checkout-1";
    order.requestHash = "hash";
    order.shippingAddress = new ShippingAddress("Buyer", "0900000000", "123 Street", "HCM");
    order.add(
        new OrderSnapshot.Line("product", "PHONE", "Phone", new BigDecimal("20000000.00"), 1), 2);
    order.history.add(new StatusChange(null, "PENDING", "Created"));
    orders.saveAndFlush(order);
    entityManager.clear();
    var loaded = orders.findById(order.id).orElseThrow();
    assertEquals(new BigDecimal("40000000.00"), loaded.totalAmount);
    assertEquals("Phone", loaded.items.get(0).productName);
    assertEquals("123 Street", loaded.shippingAddress.address());
    assertEquals("PENDING", loaded.history.get(0).newStatus);
  }
}
