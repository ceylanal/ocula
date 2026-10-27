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
  themeColor: "#f3ead6",
};

export const metadata: Metadata = {
  title: "Ocula — Göz Kasları, Görsel Algı ve Hızlı Okuma Sistemi",
  description:
    "Latince Oculus kökünden ilham alan Ocula ile göz kaslarınızı, periferal algınızı ve okuma hızınızı eğitin. PDF/EPUB destekli akıllı okuyucu.",
  applicationName: "Ocula",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ocula",
  },
  openGraph: {
    title: "Ocula — Göz Kasları, Görsel Algı ve Hızlı Okuma Sistemi",
    description:
      "RSVP, Magic Pacer, Schulte 5x5 optik egzersizleri ve PDF/EPUB destekli Akıllı E-Kitap Kütüphanesi.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-theme="sepia" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
