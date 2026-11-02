package com.shopzone.order.infrastructure;

import com.shopzone.order.domain.*;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<PurchaseOrder, UUID> {
  Optional<PurchaseOrder> findByCustomerIdAndIdempotencyKey(UUID customerId, String key);

  Page<PurchaseOrder> findByCustomerId(UUID customerId, Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select o from PurchaseOrder o where o.id=:id")
  Optional<PurchaseOrder> locked(@Param("id") UUID id);

  @Query("select o.id from PurchaseOrder o where o.status in :statuses and o.createdAt < :before")
  List<UUID> expired(
      @Param("statuses") Collection<OrderStatus> statuses,
      @Param("before") Instant before,
      Pageable page);
}
