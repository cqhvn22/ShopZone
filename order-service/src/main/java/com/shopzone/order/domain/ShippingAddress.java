package com.shopzone.order.domain;

import jakarta.validation.constraints.*;

public record ShippingAddress(
    @NotBlank @Size(max = 150) String recipient,
    @NotBlank @Size(max = 20) String phone,
    @NotBlank @Size(max = 500) String address,
    @NotBlank @Size(max = 100) String city,
    @Size(max = 100) String ward) {
  public ShippingAddress(String recipient, String phone, String address, String city) {
    this(recipient, phone, address, city, null);
  }
}
