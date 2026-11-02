package com.shopzone.product;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface Categories extends MongoRepository<Category, String> {}
