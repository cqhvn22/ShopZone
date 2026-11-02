package com.shopzone.product;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.*;

@Document("products")
@CompoundIndex(name = "uk_variant_sku", def = "{'variants.sku':1}", unique = true)
@CompoundIndex(name = "idx_category_status", def = "{'categoryId':1,'status':1}")
public class Product {
  @Id public String id;

  @Indexed(unique = true)
  public String slug;

  public String name, description, categoryId, brand, status = "ACTIVE";
  public List<String> images = List.of();
  public Map<String, String> attributes = Map.of();
  public List<Variant> variants = List.of();
  @Version public Long version;

  public record Variant(
      @NotBlank @Size(max = 100) String sku,
      @NotNull
          @DecimalMin("0.00")
          @Digits(integer = 16, fraction = 2)
          @Field(targetType = FieldType.DECIMAL128)
          BigDecimal price,
      Map<String, String> attributes,
      boolean active) {}
}
