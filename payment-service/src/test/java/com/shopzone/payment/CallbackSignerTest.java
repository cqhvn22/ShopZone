package com.shopzone.payment;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class CallbackSignerTest {
  @Test
  void signatureBindsAmountOrderCurrencyAndStatus() {
    var order = UUID.randomUUID();
    String secret = "a-long-server-only-secret-for-mock-provider";
    String signature =
        CallbackSigner.sign(secret, order, "txn", new BigDecimal("100.00"), "VND", "SUCCESS");
    assertTrue(
        CallbackSigner.matches(
            signature,
            CallbackSigner.sign(secret, order, "txn", new BigDecimal("100"), "VND", "SUCCESS")));
    assertFalse(
        CallbackSigner.matches(
            signature,
            CallbackSigner.sign(secret, order, "txn", new BigDecimal("101"), "VND", "SUCCESS")));
    assertFalse(
        CallbackSigner.matches(
            signature,
            CallbackSigner.sign(secret, order, "txn", new BigDecimal("100"), "VND", "FAILED")));
    assertFalse(CallbackSigner.matches(signature, null));
  }
}
