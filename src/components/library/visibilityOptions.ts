import type React from "react";
import { Globe, Lock, Users } from "lucide-react";
import type { BookVisibility } from "@/types";

export const VISIBILITY_OPTIONS: {
  id: BookVisibility;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "private",
    label: "Sadece Ben (Özel)",
    shortLabel: "Sadece Ben",
    desc: "Yalnızca kendi kütüphanenizde ve bulut hesabınızda görünür.",
    icon: Lock,
  },
  {
    id: "friends",
    label: "Arkadaşlarla Paylaş (Davet Linki / Kodu Üret)",
    shortLabel: "Arkadaşlarla Paylaş",
    desc: "Özel davet kodu ve link üretilir; linke tıklayanlar kitabı kütüphanesine ekleyebilir.",
    icon: Users,
  },
  {
    id: "public",
    label: "Topluluk Kütüphanesi (Herkese Açık)",
    shortLabel: "Topluluk Kütüphanesi",
    desc: "Tüm OkurLab okurları 'Keşfet' sekmesinden bu kitaba erişip birlikte okuyabilir.",
    icon: Globe,
  },
];
