import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "إدارات قطاع الري | منصة الأصول والمنشآت المائية",
  description: "بوابة موحدة لاستعراض إدارات قطاع الري وهندساتها وترعها ومنشآتها من سجل البيانات الفعلي.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/pwa-icon.svg",
    shortcut: "/pwa-icon.svg",
    apple: "/pwa-icon.svg",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "إدارات الري",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
