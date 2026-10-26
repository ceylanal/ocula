import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  title: "KitUp — Hızlı Okuma, Görsel Algı ve Akıllı E-Kitap Kütüphanesi",
  description:
    "KitUp ile RSVP, Magic Pacer, Schulte 5x5 egzersizleriyle okuma hızınızı ikiye katlayın ve PDF/EPUB kitaplarınızı akıllı okuyucuyla her cihazda okuyun.",
  applicationName: "KitUp",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KitUp",
  },
  openGraph: {
    title: "KitUp — Hızlı Okuma ve Akıllı E-Kitap Kütüphanesi",
    description:
      "RSVP, Magic Pacer, Schulte 5x5 egzersizleri ve PDF/EPUB destekli Akıllı E-Kitap Okuyucu.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
