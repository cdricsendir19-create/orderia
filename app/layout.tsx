
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orderia — إدارة التجارة والشحن",
  description: "منصة عربية لإدارة المتاجر والطلبات والشحن.",
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
