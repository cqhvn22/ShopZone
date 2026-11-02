export const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
export const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const cartTotal = (lines) =>
  lines.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
export const safeReturn = (value) =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("\\") &&
  !value.includes("\n")
    ? value
    : "/";
export const orderLabel = (status) =>
  ({
    PENDING: "Chờ xử lý",
    RESERVED: "Đang chờ thanh toán",
    CONFIRMED: "Đã xác nhận",
    PAID: "Đã thanh toán",
    SHIPPING: "Đang giao hàng",
    COMPLETED: "Giao thành công",
    CANCELLED: "Đã hủy",
  })[status] || status;
export const validQuantity = (value) =>
  Number.isSafeInteger(Number(value)) &&
  Number(value) >= 1 &&
  Number(value) <= 10000;
export function safeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
