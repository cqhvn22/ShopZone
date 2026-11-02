package com.shopzone.persistence;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.*;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConfig {
  @Bean
  NewTopic eventsTopic() {
    return TopicBuilder.name("shopzone.events").partitions(6).replicas(1).build();
  }

  @Bean
  DefaultErrorHandler errors() {
    return new DefaultErrorHandler(new FixedBackOff(2000L, FixedBackOff.UNLIMITED_ATTEMPTS));
  }
}
