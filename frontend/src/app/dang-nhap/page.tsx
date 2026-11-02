import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { isDemo } from "@/lib/catalog";
export const metadata = {
  title: "Đăng nhập",
  robots: { index: false, follow: false },
};
export default function Login() {
  return (
    <Suspense>
      <AuthForm demo={isDemo} />
    </Suspense>
  );
}
