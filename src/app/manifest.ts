import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ocula — Görsel Algı, Hızlı Okuma ve Akıllı Kütüphane",
    short_name: "Ocula",
    description:
      "Göz kaslarını, periferal görüşü ve okuma hızını geliştiren nöro-görsel egzersiz sistemi ve akıllı e-kitap okuyucu.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070a12",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/ocula-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
