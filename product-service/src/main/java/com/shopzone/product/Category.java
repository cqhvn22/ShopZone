package com.shopzone.product;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("categories")
public class Category {
  @Id public String id;
  public String name;

  @Indexed(unique = true)
  public String slug;

  public String parentId;
  public boolean active = true;
}
