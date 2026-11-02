package com.shopzone.product;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface Products extends MongoRepository<Product, String> {
  Optional<Product> findByVariantsSku(String sku);
}
