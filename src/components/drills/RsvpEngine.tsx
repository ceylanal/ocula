"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Gauge,
  Layers,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Crosshair,
} from "lucide-react";
import {
  getORPParts,
  getPunctuationDelayMultiplier,
  tokenizeParagraphs,
} from "@/lib/textUtils";

interface RsvpEngineProps {
  paragraphs: string[];
  initialWordIndex?: number;
  initialWpm?: number;
  fontClass?: string;
  autoRampEnabled?: boolean;
  onToggleAutoRamp?: () => void;
  onWordIndexChange?: (index: number, wpm: number) => void;
  onSessionSave?: (stats: {
    wordIndex: number;
    wordsRead: number;
    durationSeconds: number;
    finalWpm: number;
  }) => void;
  onFinishSession?: (stats: {
    wpm: number;
    durationSeconds: number;
    wordsRead: number;
  }) => void;
  compactHeader?: boolean;
}

export function RsvpEngine({
  paragraphs,
  initialWordIndex = 0,
  initialWpm = 350,
  fontClass = "font-sans",
  autoRampEnabled = false,
  onWordIndexChange,
  onSessionSave,
  onFinishSession,
  compactHeader = false,
}: RsvpEngineProps) {
  const { words } = useMemo(() => tokenizeParagraphs(paragraphs), [paragraphs]);
  const totalWords = words.length;

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialWordIndex, Math.max(0, totalWords - 1))
  );
  const [wpm, setWpm] = useState(initialWpm);
  const [chunkSize, setChunkSize] = useState<1 | 2 | 3>(1);
  const [alignMode, setAlignMode] = useState<"fovea" | "center">("fovea");
  const [isPlaying, setIsPlaying] = useState(false);
  const [punctuationPause, setPunctuationPause] = useState(true);
  const [completedBanner, setCompletedBanner] = useState(false);
  const [rampNotification, setRampNotification] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [lastSavedToast, setLastSavedToast] = useState<string | null>(null);

  const sessionStartRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef<number>(0);
  const wordsReadRef = useRef<number>(0);
  const unsavedWordsRef = useRef<number>(0);
  const unsavedSecondsRef = useRef<number>(0);
  const wordsSinceRampRef = useRef<number>(0);
  const secondsSinceRampRef = useRef<number>(0);
  const latestStateRef = useRef({
    currentIndex,
    wpm,
    isPlaying,
  });

  useEffect(() => {
    latestStateRef.current = { currentIndex, wpm, isPlaying };
  }, [currentIndex, wpm, isPlaying]);

  const flushSessionSave = (reason: "pause" | "unmount") => {
    let activeElapsed = 0;
    if (sessionStartRef.current) {
      activeElapsed = (Date.now() - sessionStartRef.current) / 1000;
      accumulatedSecondsRef.current += activeElapsed;
      unsavedSecondsRef.current += activeElapsed;
      sessionStartRef.current = null;
    }
    const wordsDelta = unsavedWordsRef.current;
    const secDelta = Math.round(unsavedSecondsRef.current);

    if (wordsDelta > 0 || secDelta >= 2) {
      onSessionSave?.({
        wordIndex: latestStateRef.current.currentIndex,
        wordsRead: wordsDelta,
        durationSeconds: Math.max(1, secDelta),
        finalWpm: latestStateRef.current.wpm,
      });
      if (reason === "pause") {
        setLastSavedToast(
          `Kaydedildi: Kelime #${latestStateRef.current.currentIndex + 1} • +${wordsDelta} kelime • ${latestStateRef.current.wpm} WPM`
        );
      }
      unsavedWordsRef.current = 0;
      unsavedSecondsRef.current = 0;
    }
  };

  // Save automatically on unmount if user closes reader while reading
  useEffect(() => {
    return () => {
      flushSessionSave("unmount");
    };
  }, []);

  // Clear ramp notification after 4.5s
  useEffect(() => {
    if (!rampNotification) return;
    const t = setTimeout(() => setRampNotification(null), 4500);
    return () => clearTimeout(t);
  }, [rampNotification]);

  // Clear saved toast after 3.5s
  useEffect(() => {
    if (!lastSavedToast) return;
    const t = setTimeout(() => setLastSavedToast(null), 3500);
    return () => clearTimeout(t);
  }, [lastSavedToast]);

  // Sync external initialWpm when updated from URL or parent
  useEffect(() => {
    if (initialWpm && initialWpm >= 100 && initialWpm <= 1000 && !isPlaying) {
      setWpm(initialWpm);
    }
  }, [initialWpm]);

  // Sync external initialWordIndex when book/text changes
  useEffect(() => {
    setCurrentIndex(Math.min(initialWordIndex, Math.max(0, totalWords - 1)));
    setIsPlaying(false);
    setCompletedBanner(false);
  }, [paragraphs, totalWords]);

  // Allow jumping to a bookmark/note word index when paused
  useEffect(() => {
    if (!isPlaying) {
      setCurrentIndex(Math.min(initialWordIndex, Math.max(0, totalWords - 1)));
    }
  }, [initialWordIndex, totalWords]);

  // Notify parent of progress
  useEffect(() => {
    onWordIndexChange?.(currentIndex, wpm);
  }, [currentIndex, wpm]);

  // Build current chunk string
  const currentChunkWords = useMemo(() => {
    if (totalWords === 0) return [];
    return words
      .slice(currentIndex, currentIndex + chunkSize)
      .map((w) => w.word);
  }, [words, currentIndex, chunkSize, totalWords]);

  const currentChunkText = currentChunkWords.join(" ");
  const orp = useMemo(() => getORPParts(currentChunkText), [currentChunkText]);

  // Timer loop for RSVP progression + Auto-Ramp (+10 WPM per 400 words or 120 seconds)
  useEffect(() => {
    if (!isPlaying || totalWords === 0) {
      flushSessionSave("pause");
      return;
    }

    if (!sessionStartRef.current) {
      sessionStartRef.current = Date.now();
    }

    const baseIntervalMs = (60000 / wpm) * chunkSize;
    const multiplier = punctuationPause
      ? getPunctuationDelayMultiplier(currentChunkText)
      : 1;
    const delay = Math.max(45, Math.round(baseIntervalMs * multiplier));

    const timer = setTimeout(() => {
      wordsReadRef.current += chunkSize;
      unsavedWordsRef.current += chunkSize;
      wordsSinceRampRef.current += chunkSize;
      secondsSinceRampRef.current += delay / 1000;

      // Auto-Ramp check: every 400 words or 120 seconds (2 minutes)
      if (
        autoRampEnabled &&
        (wordsSinceRampRef.current >= 400 || secondsSinceRampRef.current >= 120)
      ) {
        wordsSinceRampRef.current = 0;
        secondsSinceRampRef.current = 0;
        setWpm((prevWpm) => {
          if (prevWpm >= 1000) return prevWpm;
          const nextWpm = Math.min(1000, prevWpm + 10);
          setRampNotification({ from: prevWpm, to: nextWpm });
          return nextWpm;
        });
      }

      setCurrentIndex((prev) => {
        const next = prev + chunkSize;
        if (next >= totalWords) {
          setIsPlaying(false);
          setCompletedBanner(true);
          const extraSec = sessionStartRef.current
            ? (Date.now() - sessionStartRef.current) / 1000
            : 0;
          sessionStartRef.current = null;
          const totalSec = Math.max(
            3,
            Math.round(accumulatedSecondsRef.current + extraSec)
          );
          onFinishSession?.({
            wpm,
            durationSeconds: totalSec,
            wordsRead: Math.max(wordsReadRef.current, totalWords),
          });
          return totalWords - 1;
        }
        return next;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [
    isPlaying,
    wpm,
    chunkSize,
    currentIndex,
    totalWords,
    currentChunkText,
    punctuationPause,
    autoRampEnabled,
    onFinishSession,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setWpm((w) => Math.min(1000, w + 25));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setWpm((w) => Math.max(100, w - 25));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - chunkSize * 3));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(totalWords - 1, i + chunkSize * 3));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chunkSize, totalWords]);

  const progressPercent =
    totalWords > 1 ? Math.round((currentIndex / (totalWords - 1)) * 100) : 0;
  const remainingWords = Math.max(0, totalWords - currentIndex);
  const remainingSeconds = Math.ceil((remainingWords / wpm) * 60);

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setCompletedBanner(false);
    accumulatedSecondsRef.current = 0;
    wordsReadRef.current = 0;
  };

  return (
    <div className="space-y-5">
      {/* Top Control Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-4">
        {/* WPM Slider & Quick Controls */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Gauge className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted font-medium">Akış Hızı (WPM)</span>
              <span className="font-bold text-sm text-indigo-400">
                {wpm} WPM
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWpm((w) => Math.max(100, w - 25))}
                className="px-2 py-0.5 text-xs rounded bg-surface-elevated border border-border hover:border-indigo-500/40 transition-colors"
              >
                -25
              </button>
              <input
                type="range"
                min={100}
                max={1000}
                step={10}
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg"
              />
              <button
                onClick={() => setWpm((w) => Math.min(1000, w + 25))}
                className="px-2 py-0.5 text-xs rounded bg-surface-elevated border border-border hover:border-indigo-500/40 transition-colors"
              >
                +25
              </button>
            </div>
          </div>
        </div>

        {/* Chunk Size Selector (1, 2, 3 words) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted mr-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Kelime Grubu:</span>
          </div>
          <div className="flex rounded-xl bg-surface-elevated p-1 border border-border">
            {([1, 2, 3] as const).map((size) => (
              <button
                key={size}
                onClick={() => setChunkSize(size)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  chunkSize === size
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {size === 1 ? "Tekli" : `${size}'li Grup`}
              </button>
            ))}
          </div>
        </div>

        {/* Punctuation Micro-Pause Toggle */}
        {!compactHeader && (
          <button
            onClick={() => setPunctuationPause((p) => !p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
              punctuationPause
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-surface-elevated border-border text-muted"
            }`}
            title="Virgül ve noktalarda doğal mikro-duraksama uygular"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Akıllı Duraksama</span>
          </button>
        )}
      </div>

      {/* Main OkurLab RSVP Optical HUD Viewport */}
      <div className="relative rounded-3xl bg-surface border-2 border-indigo-500/35 overflow-hidden shadow-2xl">
        {/* Top subtle progress bar */}
        <div className="h-1.5 w-full bg-surface-elevated">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Dedicated HUD Header Bar (Non-overlapping) */}
        <div className="px-5 py-3 bg-surface-elevated/55 border-b border-border/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted font-medium tabular-nums">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-surface border border-indigo-500/30 text-indigo-400 font-bold flex items-center gap-1.5">
              <Crosshair className="w-3 h-3 text-[#B85D3B]" />
              <span>OKURLAB ODAK KİLİDİ • {wpm} WPM</span>
            </span>
            {autoRampEnabled && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Auto-Ramp (+10 WPM)</span>
              </span>
            )}
            {rampNotification && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold animate-pulse">
                ⚡ Hız İvmesi: {rampNotification.from} &rarr;{" "}
                {rampNotification.to} WPM
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastSavedToast && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold">
                {lastSavedToast}
              </span>
            )}
            {/* Alignment Axis Switcher: Fovea ORP Lock vs Symmetric Center */}
            <div className="flex items-center rounded-lg bg-surface p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setAlignMode("fovea")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  alignMode === "fovea"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "text-muted hover:text-foreground"
                }`}
                title="Kırmızı ORP harfini tam merkezdeki dikey lazer eksenine kilitler"
              >
                ORP Kilit
              </button>
              <button
                type="button"
                onClick={() => setAlignMode("center")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  alignMode === "center"
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    : "text-muted hover:text-foreground"
                }`}
                title="Kelimenin tamamını geometrik olarak ekran ortasına hizalar"
              >
                Simetrik Merkez
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Optical Stage with True Fixed Height & Precision Reticle */}
        <div className="relative h-[240px] sm:h-[270px] flex flex-col items-center justify-between py-7 px-4 sm:px-8 select-none overflow-hidden">
          {/* Ambient radial glow centered at 50% 50% */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.08),rgba(99,102,241,0.04)_45%,transparent_72%)]" />

          {/* Continuous Vertical & Horizontal Optical Crosshair Axis Guides */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 inset-y-7 w-px bg-gradient-to-b from-rose-500/45 via-rose-500/10 to-rose-500/45" />
          <div className="pointer-events-none absolute inset-x-10 top-1/2 -translate-y-1/2 h-px bg-indigo-500/10" />

          {/* Top Horizontal Optical Reticle Rail */}
          <div className="w-full max-w-2xl relative border-t border-border/90 h-3">
            <span className="absolute left-[15%] -top-1 w-px h-2 bg-border" />
            <span className="absolute left-[32.5%] -top-1 w-px h-2 bg-border" />
            {/* Center Top Laser Notch */}
            <span className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-0.5 h-4 bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
            <span className="absolute left-[67.5%] -top-1 w-px h-2 bg-border" />
            <span className="absolute left-[85%] -top-1 w-px h-2 bg-border" />
          </div>

          {/* Center Word Display Stage (100% Vertically & Horizontally Centered) */}
          <div
            className={`w-full flex-1 flex items-center justify-center relative z-10 ${fontClass}`}
          >
            {alignMode === "fovea" ? (
              /* Precision 3-Column ORP Lock: Red ORP character is locked at exact 50% center crosshair */
              <div
                className={`w-full max-w-4xl grid grid-cols-[1fr_auto_1fr] items-baseline whitespace-nowrap font-bold leading-none ${
                  currentChunkText.length > 22
                    ? "text-xl sm:text-3xl md:text-4xl"
                    : currentChunkText.length > 14
                    ? "text-2xl sm:text-4xl md:text-5xl"
                    : "text-3xl sm:text-5xl md:text-6xl"
                }`}
              >
                <span className="text-right text-foreground justify-self-end overflow-hidden">
                  {orp.prefix}
                </span>
                <span className="text-center text-rose-500 font-black px-[1px] drop-shadow-[0_0_14px_rgba(244,63,94,0.45)] underline decoration-rose-500/70 decoration-2 underline-offset-8">
                  {orp.orpChar}
                </span>
                <span className="text-left text-foreground justify-self-start overflow-hidden">
                  {orp.suffix}
                </span>
              </div>
            ) : (
              /* Symmetric Geometric Center: Whole word/chunk is centered at 50% with ORP letter highlighted */
              <div
                className={`w-full max-w-4xl flex items-baseline justify-center whitespace-nowrap font-bold leading-none text-center ${
                  currentChunkText.length > 22
                    ? "text-xl sm:text-3xl md:text-4xl"
                    : currentChunkText.length > 14
                    ? "text-2xl sm:text-4xl md:text-5xl"
                    : "text-3xl sm:text-5xl md:text-6xl"
                }`}
              >
                <span className="text-foreground">{orp.prefix}</span>
                <span className="text-rose-500 font-black px-[1px] drop-shadow-[0_0_14px_rgba(244,63,94,0.45)] underline decoration-rose-500/70 decoration-2 underline-offset-8">
                  {orp.orpChar}
                </span>
                <span className="text-foreground">{orp.suffix}</span>
              </div>
            )}
          </div>

          {/* Bottom Horizontal Optical Reticle Rail */}
          <div className="w-full max-w-2xl relative border-b border-border/90 h-3">
            <span className="absolute left-[15%] -bottom-1 w-px h-2 bg-border" />
            <span className="absolute left-[32.5%] -bottom-1 w-px h-2 bg-border" />
            {/* Center Bottom Laser Notch */}
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0.5 h-4 bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
            <span className="absolute left-[67.5%] -bottom-1 w-px h-2 bg-border" />
            <span className="absolute left-[85%] -bottom-1 w-px h-2 bg-border" />
          </div>
        </div>

        {/* Interactive Word Scrubber & Telemetry Status Bar */}
        <div className="px-6 py-3 bg-surface-elevated/45 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted tabular-nums">
          <div className="flex items-center gap-2 shrink-0">
            <span>
              Kelime:{" "}
              <strong className="text-foreground">{currentIndex + 1}</strong> /{" "}
              {totalWords} (%{progressPercent})
            </span>
          </div>

          {/* Interactive Scrubber Slider */}
          <div className="flex-1 max-w-md flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(0, totalWords - 1)}
              value={currentIndex}
              onChange={(e) => {
                setCurrentIndex(Number(e.target.value));
              }}
              className="w-full accent-rose-500 cursor-pointer h-1.5 rounded-lg"
              title="Kelime konumunu kaydır"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span>
              Grup: <strong className="text-foreground">{chunkSize} Kelime</strong>
            </span>
            <span>
              Tahmini Kalan:{" "}
              <strong className="text-foreground">{remainingSeconds} sn</strong>
            </span>
          </div>
        </div>

        {/* Transport & Scrubber Controls */}
        <div className="px-6 py-4 bg-surface-elevated/70 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors"
              title="Başa Sar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setCurrentIndex((i) => Math.max(0, i - chunkSize * 5))
              }
              className="p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors"
              title="Geri Al (Sol Ok)"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (currentIndex >= totalWords - 1) {
                  setCurrentIndex(0);
                }
                setCompletedBanner(false);
                setIsPlaying((p) => !p);
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Duraklat</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {currentIndex > 0 && currentIndex < totalWords - 1
                      ? "Devam Et"
                      : "Başlat"}
                  </span>
                </>
              )}
            </button>
            <button
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(totalWords - 1, i + chunkSize * 5)
                )
              }
              className="p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors"
              title="İleri Sar (Sağ Ok)"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Quick WPM Presets */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <span className="text-[11px] text-muted mr-1">Hızlı Seçim:</span>
            {[250, 350, 450, 600, 800].map((preset) => (
              <button
                key={preset}
                onClick={() => setWpm(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  wpm === preset
                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                    : "bg-surface border-border text-muted hover:text-foreground"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Completion Feedback Banner */}
      {completedBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-sm">
                RSVP Okuma Antrenmanı Tamamlandı!
              </div>
              <div className="text-xs text-muted">
                {totalWords} kelimelik metni{" "}
                <strong className="text-emerald-400">{wpm} WPM</strong> odak
                hızıyla tamamladınız ve istatistiklerinize kaydedildi.
              </div>
            </div>
          </div>
          <button
            onClick={handleRestart}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shrink-0"
          >
            Tekrarla
          </button>
        </div>
      )}
    </div>
  );
}
