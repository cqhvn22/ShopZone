import { Orders } from "@/components/Orders";
export const metadata = {
  title: "Đơn hàng của tôi",
  robots: { index: false, follow: false },
};
export default function OrdersPage() {
  return <Orders />;
}
