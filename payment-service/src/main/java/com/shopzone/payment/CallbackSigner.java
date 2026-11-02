package com.shopzone.payment;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class CallbackSigner {
  private CallbackSigner() {}

  public static String sign(
      String secret,
      UUID order,
      String transaction,
      BigDecimal amount,
      String currency,
      String status) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of()
          .formatHex(
              mac.doFinal(
                  (order
                          + "|"
                          + transaction
                          + "|"
                          + amount.setScale(2).toPlainString()
                          + "|"
                          + currency
                          + "|"
                          + status)
                      .getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalArgumentException("Cannot sign callback", e);
    }
  }

  public static boolean matches(String expected, String supplied) {
    return supplied != null
        && MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8));
  }
}
