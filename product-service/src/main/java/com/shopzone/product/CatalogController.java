package com.shopzone.product;

import com.shopzone.common.*;
import com.shopzone.product.Product.Variant;
import jakarta.validation.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {
  private final Products products;
  private final Categories categories;
  private final MongoTemplate mongo;

  public CatalogController(Products products, Categories categories, MongoTemplate mongo) {
    this.products = products;
    this.categories = categories;
    this.mongo = mongo;
  }

  public record ProductInput(
      @NotBlank @Size(max = 255) String name,
      @NotBlank @Pattern(regexp = "[a-z0-9-]+") String slug,
      @Size(max = 10000) String description,
      @NotBlank String categoryId,
      @Size(max = 100) String brand,
      List<String> images,
      Map<String, String> attributes,
      @NotEmpty @Size(max = 100) @Valid List<@NotNull Variant> variants) {}

  public record CategoryInput(
      @NotBlank String name,
      @NotBlank @Pattern(regexp = "[a-z0-9-]+") String slug,
      String parentId,
      boolean active) {}

  @GetMapping("/products")
  public Map<String, Object> list(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(required = false) String categoryId,
      @RequestParam(required = false) BigDecimal minPrice,
      @RequestParam(required = false) BigDecimal maxPrice,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    var c = Criteria.where("status").is("ACTIVE");
    if (!q.isBlank()) c = c.and("name").regex(java.util.regex.Pattern.quote(q), "i");
    if (categoryId != null) c = c.and("categoryId").is(categoryId);
    var price = Criteria.where("active").is(true);
    if (minPrice != null && maxPrice != null)
      price = price.and("price").gte(minPrice).lte(maxPrice);
    else if (minPrice != null) price = price.and("price").gte(minPrice);
    else if (maxPrice != null) price = price.and("price").lte(maxPrice);
    c = c.and("variants").elemMatch(price);
    var query = Query.query(c);
    long total = mongo.count(query, Product.class);
    var paging =
        PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by("name", "id"));
    return Map.of(
        "content",
        mongo.find(query.with(paging), Product.class),
        "totalElements",
        total,
        "page",
        paging.getPageNumber(),
        "size",
        paging.getPageSize());
  }

  @GetMapping("/products/sku/{sku}")
  public OrderSnapshot.Line quote(@PathVariable String sku) {
    var p =
        products
            .findByVariantsSku(sku)
            .filter(x -> x.status.equals("ACTIVE"))
            .orElseThrow(ApiException::missing);
    var v =
        p.variants.stream()
            .filter(x -> x.sku().equals(sku) && x.active())
            .findFirst()
            .orElseThrow(ApiException::missing);
    var c =
        categories.findById(p.categoryId).filter(x -> x.active).orElseThrow(ApiException::missing);
    return new OrderSnapshot.Line(p.id, sku, p.name, v.price(), 1);
  }

  @GetMapping("/products/{id}")
  public Product get(@PathVariable String id) {
    return products
        .findById(id)
        .filter(p -> p.status.equals("ACTIVE") || CallerSafe.admin())
        .orElseThrow(ApiException::missing);
  }

  @PostMapping("/products")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Product create(@Valid @RequestBody ProductInput r) {
    return save(new Product(), r);
  }

  @PutMapping("/products/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public Product update(@PathVariable String id, @Valid @RequestBody ProductInput r) {
    return save(products.findById(id).orElseThrow(ApiException::missing), r);
  }

  private Product save(Product p, ProductInput r) {
    if (categories.findById(r.categoryId()).filter(c -> c.active).isEmpty())
      throw ApiException.bad("Active category required");
    var unique = new HashSet<String>();
    for (var v : r.variants())
      if (!unique.add(v.sku())) throw ApiException.conflict("Duplicate SKU in the same product");
    p.name = r.name();
    p.slug = r.slug();
    p.description = r.description();
    p.categoryId = r.categoryId();
    p.brand = r.brand();
    p.images = r.images() == null ? List.of() : r.images();
    p.attributes = r.attributes() == null ? Map.of() : r.attributes();
    p.variants = r.variants();
    return products.save(p);
  }

  @DeleteMapping("/products/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public void deactivate(@PathVariable String id) {
    var p = products.findById(id).orElseThrow(ApiException::missing);
    p.status = "INACTIVE";
    products.save(p);
  }

  @GetMapping("/categories")
  public List<Category> categories() {
    return categories.findAll().stream().filter(c -> c.active).toList();
  }

  @PostMapping("/categories")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Category category(@Valid @RequestBody CategoryInput r) {
    return saveCategory(new Category(), r);
  }

  @PutMapping("/categories/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public Category category(@PathVariable String id, @Valid @RequestBody CategoryInput r) {
    return saveCategory(categories.findById(id).orElseThrow(ApiException::missing), r);
  }

  @DeleteMapping("/categories/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public void removeCategory(@PathVariable String id) {
    var c = categories.findById(id).orElseThrow(ApiException::missing);
    c.active = false;
    categories.save(c);
  }

  private Category saveCategory(Category c, CategoryInput r) {
    String ancestor = r.parentId();
    var seen = new HashSet<String>();
    while (ancestor != null) {
      if (ancestor.equals(c.id) || !seen.add(ancestor)) throw ApiException.bad("Category cycle");
      ancestor = categories.findById(ancestor).orElseThrow(ApiException::missing).parentId;
    }
    c.name = r.name();
    c.slug = r.slug();
    c.parentId = r.parentId();
    c.active = r.active();
    return categories.save(c);
  }

  private static class CallerSafe {
    static boolean admin() {
      return org.springframework.security.core.context.SecurityContextHolder.getContext()
                  .getAuthentication()
              instanceof
              org.springframework.security.oauth2.server.resource.authentication
                  .JwtAuthenticationToken
          && Caller.admin();
    }
  }
}
