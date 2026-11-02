import { Checkout } from "@/components/Checkout";
import { isDemo } from "@/lib/catalog";
export const metadata = {
  title: "Thanh toán",
  robots: { index: false, follow: false },
};
export default function CheckoutPage() {
  return <Checkout demo={isDemo} />;
}
