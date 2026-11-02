import { Orders } from "@/components/Orders";
export const metadata = {
  title: "Chi tiết đơn hàng",
  robots: { index: false, follow: false },
};
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Orders id={(await params).id} />;
}
