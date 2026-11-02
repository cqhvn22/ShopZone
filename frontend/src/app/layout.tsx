import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/components/StoreProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { isDemo, siteUrl } from "@/lib/catalog";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ShopZone — Mua sắm công nghệ mỗi ngày",
    template: "%s | ShopZone",
  },
  description:
    "Khám phá điện thoại, laptop, tai nghe, đồng hồ và phụ kiện công nghệ tại ShopZone. Thông tin rõ ràng, mua sắm thuận tiện.",
  applicationName: "ShopZone",
  robots: isDemo
    ? { index: false, follow: false }
    : { index: true, follow: true },
  icons: { icon: "/icon.svg" },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0874df",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <StoreProvider>
          <Header demo={isDemo} />
          <main id="main-content">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
