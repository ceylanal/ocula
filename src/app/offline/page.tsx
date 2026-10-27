import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Çevrimdışı — OkurLab",
};

export default function OfflinePage() {
  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-[#B85D3B]/15 border border-[#B85D3B]/30 text-[#B85D3B] flex items-center justify-center">
        <WifiOff className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
          Şu an çevrimdışısın
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Bu sayfa daha önce açılmadığı için çevrimdışı yüklenemedi. Kitapların,
          notların ve okuma konumların bu cihazda saklanıyor; daha önce açtığın
          sayfalar ve indirdiğin ses modelleri çevrimdışı çalışmaya devam eder.
          Bağlantı geri geldiğinde değişikliklerin otomatik eşitlenir.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/library"
          className="px-5 py-3 rounded-2xl bg-[#B85D3B] hover:bg-[#A14D2E] text-[#F6F1E7] text-sm font-bold transition-all"
        >
          Kitaplığıma Git
        </Link>
        <Link
          href="/"
          className="px-5 py-3 rounded-2xl bg-surface border border-border text-sm font-semibold hover:bg-surface-elevated transition-all"
        >
          Okuma Stüdyosu
        </Link>
      </div>
    </div>
  );
}
