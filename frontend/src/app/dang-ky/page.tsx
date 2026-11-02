import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { isDemo } from "@/lib/catalog";
export const metadata = {
  title: "Đăng ký tài khoản",
  robots: { index: false, follow: false },
};
export default function Register() {
  return (
    <Suspense>
      <AuthForm demo={isDemo} register />
    </Suspense>
  );
}
