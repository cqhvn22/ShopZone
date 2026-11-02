import { Admin } from "@/components/Admin";
import "./admin.css";
export const metadata = {
  title: "Quản trị cửa hàng",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <Admin />;
}
