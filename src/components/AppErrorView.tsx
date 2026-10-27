"use client";

import React, { useEffect } from "react";

const STORAGE_KEY = "okurlab-storage-v2";

/** Yerel durumu ve service worker önbelleklerini temizleyip sayfayı yeniden yükler. */
async function resetLocalState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Depolama erişilemez
  }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("okurlab-")).map((n) => caches.delete(n))
      );
    }
  } catch {
    // Temizlenemeyenler yok sayılır
  }
  window.location.reload();
}

interface AppErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Beklenmeyen istemci hatasında, Next'in genel "Application error" ekranı yerine
 * gerçek hata iletisini gösterir ve toparlanma yolları sunar. Konsola erişilemeyen
 * mobil cihazlarda hatanın nedenini görünür kılar.
 */
export function AppErrorView({ error, reset }: AppErrorViewProps) {
  useEffect(() => {
    console.error("OkurLab istemci hatası:", error);
  }, [error]);

  const stackLines = (error.stack || "")
    .split("\n")
    .slice(0, 6)
    .map((l) => l.trim().slice(0, 140))
    .join("\n");

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-5 text-center">
      <h1 className="text-2xl font-serif font-bold">Bir şeyler ters gitti</h1>
      <p className="text-sm leading-relaxed opacity-80">
        Sayfa beklenmedik bir hatayla karşılaştı. Önce yeniden dene; sorun sürerse
        yerel önbelleği temizlemek çoğu zaman çözer (okuma verilerin bulut hesabında
        duruyorsa kaybolmaz).
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-3 rounded-2xl bg-[#B85D3B] text-[#F6F1E7] text-sm font-bold"
        >
          Yeniden Dene
        </button>
        <button
          onClick={() => {
            if (
              window.confirm(
                "Bu cihazdaki yerel okuma verisi ve çevrimdışı önbellek silinecek. Bulutla eşitlenmemiş notlar kaybolur. Devam edilsin mi?"
              )
            ) {
              resetLocalState();
            }
          }}
          className="px-5 py-3 rounded-2xl border border-[#DFD5C3] text-sm font-semibold"
        >
          Önbelleği ve Yerel Veriyi Temizle
        </button>
      </div>

      <details className="text-left text-xs rounded-2xl border border-[#DFD5C3] p-4">
        <summary className="cursor-pointer font-semibold">Hata ayrıntısı</summary>
        <pre className="mt-3 whitespace-pre-wrap break-words opacity-80">
          {error.name}: {error.message}
          {error.digest ? `\nSüreç no: ${error.digest}` : ""}
          {stackLines ? `\n\n${stackLines}` : ""}
        </pre>
      </details>
    </div>
  );
}
