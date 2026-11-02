package com.shopzone.notification;

import org.slf4j.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class EmailDelivery {
  private static final Logger log = LoggerFactory.getLogger(EmailDelivery.class);
  private final JdbcTemplate jdbc;
  private final JavaMailSender mail;

  public EmailDelivery(JdbcTemplate jdbc, JavaMailSender mail) {
    this.jdbc = jdbc;
    this.mail = mail;
  }

  @Scheduled(fixedDelay = 5000)
  @Transactional
  public void deliver() {
    var rows =
        jdbc.queryForList(
            "select * from notifications where channel='EMAIL' and status='PENDING' and"
                + " next_attempt_at<=current_timestamp order by created_at limit 10 for update skip"
                + " locked");
    for (var r : rows) {
      try {
        var m = new SimpleMailMessage();
        m.setFrom("noreply@shopzone.local");
        m.setTo(r.get("recipient").toString());
        m.setSubject(r.get("subject").toString());
        m.setText(r.get("content").toString());
        mail.send(m);
        jdbc.update(
            "update notifications set status='SENT',sent_at=current_timestamp where id=?",
            r.get("id"));
      } catch (MailException e) {
        jdbc.update(
            "update notifications set retry_count=retry_count+1,status=case when retry_count>=9"
                + " then 'FAILED' else 'PENDING' end,next_attempt_at=current_timestamp + interval"
                + " '30 seconds' where id=?",
            r.get("id"));
        log.warn("Email delivery failed; retry scheduled for notification {}", r.get("id"));
      }
    }
  }
}
