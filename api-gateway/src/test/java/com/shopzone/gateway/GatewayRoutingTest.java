package com.shopzone.gateway;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "shopzone.jwt-secret=gateway-test-secret-over-thirty-two-bytes",
      "shopzone.issuer=shopzone"
    })
class GatewayRoutingTest {
  private static final HttpServer BACKEND;

  static {
    try {
      BACKEND = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
      BACKEND.createContext(
          "/",
          exchange -> {
            byte[] body =
                ("{\"path\":\"" + exchange.getRequestURI().getPath() + "\"}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
          });
      BACKEND.start();
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void routes(DynamicPropertyRegistry properties) {
    String target = "http://127.0.0.1:" + BACKEND.getAddress().getPort();
    for (String service :
        new String[] {"auth", "product", "order", "inventory", "payment", "notification"}) {
      properties.add("shopzone." + service + "-url", () -> target);
    }
  }

  @Autowired TestRestTemplate http;

  @Test
  void routesPublicCatalogWithoutChangingPath() {
    var response = http.getForEntity("/api/v1/products", String.class);
    assertEquals(200, response.getStatusCode().value());
    assertTrue(response.getBody().contains("/api/v1/products"));
  }

  @Test
  void gatewayRejectsUnauthenticatedOrderRequest() {
    assertEquals(401, http.getForEntity("/api/v1/orders", String.class).getStatusCode().value());
  }

  @Test
  void readinessIsAvailableWithoutBusinessInfrastructure() {
    assertEquals(
        200, http.getForEntity("/actuator/health/readiness", String.class).getStatusCode().value());
  }

  @AfterAll
  static void close() {
    BACKEND.stop(0);
  }
}
