import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orderia",
  description: "منصة إدارة الطلبات والشحن للتجار",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>{children}</body>
    </html>
  );
}
