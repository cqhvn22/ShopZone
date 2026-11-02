package com.shopzone.gateway;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** A bounded local quota for the single-instance demo gateway. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {
  private record Window(long minute, AtomicInteger count) {}

  private final ConcurrentHashMap<String, Window> clients = new ConcurrentHashMap<>();
  private final int limit;

  public RateLimitFilter(@Value("${shopzone.requests-per-minute:600}") int limit) {
    this.limit = limit;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (!request.getRequestURI().startsWith("/api/") || request.getMethod().equals("OPTIONS")) {
      chain.doFilter(request, response);
      return;
    }
    long minute = System.currentTimeMillis() / 60000;
    if (clients.size() >= 10000) {
      clients.entrySet().removeIf(entry -> entry.getValue().minute() < minute);
      if (clients.size() >= 10000 && !clients.containsKey(request.getRemoteAddr())) {
        reject(response);
        return;
      }
    }
    var window =
        clients.compute(
            request.getRemoteAddr(),
            (ip, previous) ->
                previous == null || previous.minute() != minute
                    ? new Window(minute, new AtomicInteger())
                    : previous);
    if (window.count().incrementAndGet() > limit) {
      reject(response);
      return;
    }
    chain.doFilter(request, response);
  }

  private void reject(HttpServletResponse response) throws IOException {
    response.setStatus(429);
    response.setHeader("Retry-After", "60");
    response.setContentType("application/problem+json");
    response.getWriter().write("{\"status\":429,\"title\":\"Too Many Requests\"}");
  }
}
