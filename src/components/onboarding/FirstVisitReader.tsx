"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Moon, ScanLine, Sun } from "lucide-react";
import { useOkurLabStore } from "@/store/useOkurLabStore";
import { OkurLabLogo } from "@/components/OkurLabLogo";

const PARAGRAPHS = [
  "Bu sayfa bir tanıtım değil, ilk alıştırman. Aşağı kaydırdıkça gözünün durduğu paragraf netleşir, çevresi hafifçe solar. Böylece satırı kaybetmeden, acele etmeden ilerlersin.",
  "Yazı çok küçük ya da ekran çok parlaksa üstteki düğmelerle boyutu büyütebilir, geceye geçebilirsin. Okuduğunu anlaman kadar, gözünün yorulmaması da önemli.",
  "OkurLab kendi kitaplarını okuduğun bir yer. PDF, EPUB ya da düz metin dosyanı yüklersin; baştan sona aynı sakin düzende okursun. İstersen bir vurgu bloğu kelimeleri senin için sırayla işaretler, istersen kelimeler ekranın ortasında tek tek akar.",
  "Hızın yavaş yavaş artsın diye kademeli hızlanma da var: birkaç dakikada bir hız biraz yükselir, sen fark etmeden alışırsın. Cümleleri sesli dinleyebilirsin; ses modeli bir kez indirildikten sonra internet olmadan çalışır.",
  "Hız tek başına bir şey söylemez. Ölçüm testinde okuduktan sonra birkaç soru sorulur; hızını, anladığınla birlikte görürsün.",
  "Hazır olduğunda bir kitapla başla.",
];

const MIN_FONT = 16;
const MAX_FONT = 28;
// Odak bandı dışındaki paragraflar bu opaklığın altına inmez; okunaklılık korunur.
const MIN_OPACITY = 0.62;

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B85D3B]";

/**
 * İlk kez gelen kişiyi panel yerine doğrudan bir okuma ekranı karşılar: metnin kendisi
 * tanıtımdır. Tek bir sütun, geniş satır aralığı ve kaydırdıkça yumuşakça netleşen
 * "odak bandı" dışında süs yoktur.
 */
export function FirstVisitReader() {
  const {
    theme,
    setTheme,
    readerPrefs,
    updateReaderPrefs,
    completeOnboarding,
    books,
    lastActiveBookId,
  } = useOkurLabStore();

  const [focusBand, setFocusBand] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const fontSize = Math.min(MAX_FONT, Math.max(MIN_FONT, readerPrefs.fontSize || 19));
  const isDark = theme === "dark";

  // Hareketi azaltmayı isteyen kişide odak bandı varsayılan olarak kapalı başlar.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFocusBand(false);
    }
  }, []);

  const update = useCallback(() => {
    rafRef.current = null;
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    setProgress(Math.min(1, Math.max(0, window.scrollY / max)));

    const vh = window.innerHeight;
    const focusY = vh * 0.42;
    paragraphRefs.current.forEach((el) => {
      if (!el) return;
      if (!focusBand) {
        el.style.opacity = "1";
        return;
      }
      const rect = el.getBoundingClientRect();
      // Paragrafın en yakın kenarı odak çizgisine uzaklığı (paragraf büyükse içinde sayılır)
      const distance =
        focusY >= rect.top && focusY <= rect.bottom
          ? 0
          : Math.min(Math.abs(rect.top - focusY), Math.abs(rect.bottom - focusY));
      const t = Math.max(0, distance / vh - 0.06);
      el.style.opacity = String(Math.max(MIN_OPACITY, 1 - t * 1.1));
    });
  }, [focusBand]);

  useEffect(() => {
    const schedule = () => {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [update, fontSize]);

  const sampleBookId = books.find((b) => b.id === lastActiveBookId)?.id ?? books[0]?.id;
  const sampleHref = sampleBookId
    ? `/library?book=${encodeURIComponent(sampleBookId)}&mode=standard`
    : "/library";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-[2px] z-50 bg-transparent"
      >
        <div
          className="h-full bg-[#B85D3B] origin-left"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-sm">
        <div className="max-w-[38rem] mx-auto px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <OkurLabLogo size="sm" showText={false} />
            {/* Marka yazısı tema rengini izler; gece modunda koyu mürekkep kaybolmasın */}
            <span className="hidden sm:inline font-serif text-lg font-bold tracking-tight">
              Okur<span className="text-[#B85D3B] font-medium">Lab</span>
            </span>
          </div>

          <div className="flex items-center -mr-2 text-muted">
            <button
              type="button"
              onClick={() => updateReaderPrefs({ fontSize: Math.max(MIN_FONT, fontSize - 1) })}
              disabled={fontSize <= MIN_FONT}
              aria-label="Yazıyı küçült"
              className={`w-9 h-9 rounded-lg font-serif text-sm hover:text-foreground disabled:opacity-40 ${focusRing}`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => updateReaderPrefs({ fontSize: Math.min(MAX_FONT, fontSize + 1) })}
              disabled={fontSize >= MAX_FONT}
              aria-label="Yazıyı büyüt"
              className={`w-9 h-9 rounded-lg font-serif text-xl leading-none hover:text-foreground disabled:opacity-40 ${focusRing}`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFocusBand((v) => !v)}
              aria-pressed={focusBand}
              aria-label="Odak bandı"
              title="Odak bandı: gözünün durduğu paragraf netleşir"
              className={`w-9 h-9 rounded-lg flex items-center justify-center hover:text-foreground ${
                focusBand ? "text-[#B85D3B]" : ""
              } ${focusRing}`}
            >
              <ScanLine className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "sepia" : "dark")}
              aria-label={isDark ? "Sepya kâğıda geç" : "Geceye geç"}
              className={`w-9 h-9 rounded-lg flex items-center justify-center hover:text-foreground ${focusRing}`}
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <button
              type="button"
              onClick={completeOnboarding}
              className={`ml-1 px-3 h-9 rounded-lg text-sm hover:text-foreground ${focusRing}`}
            >
              Atla
            </button>
          </div>
        </div>
      </header>

      <main>
        <article
          className="max-w-[38rem] mx-auto px-6 pt-[10vh] pb-[40vh] font-serif text-[length:var(--fs)] sm:text-[length:calc(var(--fs)_+_2px)]"
          style={{ "--fs": `${fontSize}px`, lineHeight: 1.85 } as React.CSSProperties}
        >
          <h1
            className="font-serif font-semibold tracking-[-0.015em] leading-[1.1] mb-10 text-foreground"
            style={{ fontSize: "clamp(2.1rem, 6vw, 3.1rem)" }}
          >
            Önce biraz oku.
          </h1>

          {PARAGRAPHS.map((text, i) => (
            <p
              key={i}
              ref={(el) => {
                paragraphRefs.current[i] = el;
              }}
              className="mb-[1.4em] motion-safe:transition-opacity motion-safe:duration-300"
              style={{ textWrap: "pretty", hyphens: "auto" } as React.CSSProperties}
              lang="tr"
            >
              {text}
            </p>
          ))}

          <div className="mt-[3.2em] font-sans text-base space-y-6" style={{ lineHeight: 1.5 }}>
            <Link
              href={sampleHref}
              onClick={completeOnboarding}
              className={`inline-flex items-center px-6 py-3.5 rounded-xl bg-[#B85D3B] text-[#FBF7EE] font-semibold hover:bg-[#A14D2E] ${focusRing}`}
            >
              Örnek kitabı aç
            </Link>
            <p className="text-muted">
              <Link
                href="/library"
                onClick={completeOnboarding}
                className={`underline underline-offset-4 hover:text-foreground rounded ${focusRing}`}
              >
                Kendi dosyanı yükle
              </Link>
              <span aria-hidden="true" className="mx-3">
                /
              </span>
              <Link
                href="/speed-test"
                onClick={completeOnboarding}
                className={`underline underline-offset-4 hover:text-foreground rounded ${focusRing}`}
              >
                Hızını ölç
              </Link>
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
