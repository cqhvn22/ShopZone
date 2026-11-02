package com.shopzone.product;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.shopzone.common.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class CatalogRulesTest {
  final Products products = mock(Products.class);
  final Categories categories = mock(Categories.class);
  final CatalogController catalog =
      new CatalogController(
          products, categories, mock(org.springframework.data.mongodb.core.MongoTemplate.class));

  @Test
  void rejectsDuplicateSkuInsideOneDocument() {
    var c = new Category();
    c.id = "cat";
    when(categories.findById("cat")).thenReturn(Optional.of(c));
    var v = new Product.Variant("DUPLICATE", BigDecimal.TEN, Map.of(), true);
    var input =
        new CatalogController.ProductInput(
            "Phone", "phone", null, "cat", "brand", List.of(), Map.of(), List.of(v, v));
    assertThrows(ApiException.class, () -> catalog.create(input));
    verify(products, never()).save(any());
  }

  @Test
  void inactiveVariantCannotBeQuoted() {
    var p = new Product();
    p.variants = List.of(new Product.Variant("SKU", BigDecimal.ONE, Map.of(), false));
    when(products.findByVariantsSku("SKU")).thenReturn(Optional.of(p));
    assertThrows(ApiException.class, () -> catalog.quote("SKU"));
  }
}
