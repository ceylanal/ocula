import type { Metadata, Viewport } from "next";
import { Literata, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin", "latin-ext"],
  variable: "--font-literata",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F6F1E7",
};

export const metadata: Metadata = {
  title: "OkurLab — Sıcak Sepya Kitap Stüdyosu & Kademeli Okuma Laboratuvarı",
  description:
    "Uzun süreli kitap okumaya uygun sıcak parşömen kağıt dokusu, PDF/EPUB okuyucu, çevrimdışı nöral sesli okuma ve odak pacer laboratuvarı.",
  applicationName: "OkurLab",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OkurLab",
  },
  openGraph: {
    title: "OkurLab — Sıcak Sepya Kitap Stüdyosu & Okuma Laboratuvarı",
    description:
      "Göz yormayan sıcak sepya kağıt üzerinde PDF/EPUB okuma, Pacer odak bloğu ve çevrimdışı nöral sesli okuma deneyimi.",
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
      <body
        className={`${plusJakarta.variable} ${literata.variable} font-sans antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
