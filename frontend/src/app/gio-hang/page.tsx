import { CartView } from "@/components/CartView";
export const metadata = {
  title: "Giỏ hàng",
  robots: { index: false, follow: false },
};
export default function CartPage() {
  return <CartView />;
}
