import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KitUp — Hızlı Okuma ve Akıllı E-Kitap Kütüphanesi",
    short_name: "KitUp",
    description:
      "RSVP, Magic Pacer, Schulte 5x5 egzersizleri ve PDF/EPUB destekli Akıllı E-Kitap Okuyucu.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f17",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/kitup-logo.svg",
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
