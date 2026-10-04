import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shanilo",
  description: "Shanilo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
