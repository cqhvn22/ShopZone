package com.shopzone.notification;

import com.shopzone.common.Caller;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
  private final JdbcTemplate jdbc;

  public NotificationController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping
  public List<Map<String, Object>> list(@RequestParam(defaultValue = "0") int page) {
    return jdbc.queryForList(
        "select id,order_id,type,channel,subject,content,status,created_at from notifications where"
            + " customer_id=? order by created_at desc limit 50 offset ?",
        Caller.id(),
        Math.min(100000, Math.max(0, page)) * 50);
  }
}
