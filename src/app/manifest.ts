import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OkurLab — Sıcak Sepya Kitap Stüdyosu & Okuma Laboratuvarı",
    short_name: "OkurLab",
    description:
      "Uzun süreli kitap okumaya uygun sıcak sepya kağıt dokusu, PDF/EPUB okuyucu, çevrimdışı sesli okuma ve odak pacer laboratuvarı.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F1E7",
    theme_color: "#B85D3B",
    icons: [
      {
        src: "/okurlab-logo.svg",
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
