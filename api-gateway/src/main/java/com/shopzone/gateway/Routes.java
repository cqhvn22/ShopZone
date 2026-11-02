package com.shopzone.gateway;

import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;
import static org.springframework.web.servlet.function.RequestPredicates.path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.web.servlet.function.*;

@Configuration
public class Routes {
  @Bean
  RouterFunction<ServerResponse> gateway(
      @Value("${shopzone.auth-url}") String auth,
      @Value("${shopzone.product-url}") String product,
      @Value("${shopzone.order-url}") String order,
      @Value("${shopzone.inventory-url}") String inventory,
      @Value("${shopzone.payment-url}") String payment,
      @Value("${shopzone.notification-url}") String notification) {
    return route("shopzone")
        .route(path("/api/v1/auth/**").or(path("/api/v1/users/**")), http(auth))
        .route(path("/api/v1/products/**").or(path("/api/v1/categories/**")), http(product))
        .route(
            path("/api/v1/orders/**")
                .or(path("/api/v1/cart/**"))
                .or(path("/api/v1/admin/statistics")),
            http(order))
        .route(path("/api/v1/inventory/**"), http(inventory))
        .route(path("/api/v1/payments/**"), http(payment))
        .route(path("/api/v1/notifications/**"), http(notification))
        .build();
  }
}
