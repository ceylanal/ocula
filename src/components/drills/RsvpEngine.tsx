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
  onWordIndexChange?: (index: number, wpm: number) => void;
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
  onWordIndexChange,
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [punctuationPause, setPunctuationPause] = useState(true);
  const [completedBanner, setCompletedBanner] = useState(false);

  const sessionStartRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef<number>(0);
  const wordsReadRef = useRef<number>(0);

  // Sync external initialWpm when updated from URL or parent
  useEffect(() => {
    if (initialWpm && initialWpm >= 100 && initialWpm <= 1000) {
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

  // Timer loop for RSVP progression
  useEffect(() => {
    if (!isPlaying || totalWords === 0) {
      if (sessionStartRef.current) {
        accumulatedSecondsRef.current +=
          (Date.now() - sessionStartRef.current) / 1000;
        sessionStartRef.current = null;
      }
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

      {/* Main RSVP Focal Viewport */}
      <div className="relative rounded-3xl bg-surface border-2 border-border overflow-hidden shadow-xl">
        {/* Top subtle progress bar */}
        <div className="h-1.5 w-full bg-surface-elevated">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Focal Reticle Guides */}
        <div className="relative h-64 sm:h-72 flex flex-col items-center justify-center px-6 select-none">
          {/* Horizontal guide bars */}
          <div className="w-full max-w-lg border-t border-border/80 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-0.5 h-4 bg-rose-500/80" />
          </div>

          {/* Word Display Stage */}
          <div
            className={`my-10 w-full flex items-center justify-center ${fontClass}`}
          >
            {chunkSize === 1 ? (
              /* Single-word ORP precision alignment: keeps ORP red character locked at center */
              <div className="w-full max-w-2xl grid grid-cols-[1fr_auto_1fr] items-baseline text-3xl sm:text-5xl md:text-6xl font-bold tracking-wide">
                <span className="text-right text-foreground">
                  {orp.prefix}
                </span>
                <span className="text-rose-500 font-extrabold px-[1px] underline decoration-rose-500/40 decoration-2 underline-offset-8">
                  {orp.orpChar}
                </span>
                <span className="text-left text-foreground">
                  {orp.suffix}
                </span>
              </div>
            ) : (
              /* Multi-word group display with ORP highlight */
              <div className="text-center text-2xl sm:text-4xl md:text-5xl font-bold tracking-wide px-4">
                <span className="text-foreground">{orp.prefix}</span>
                <span className="text-rose-500 font-extrabold">
                  {orp.orpChar}
                </span>
                <span className="text-foreground">{orp.suffix}</span>
              </div>
            )}
          </div>

          {/* Bottom guide bar */}
          <div className="w-full max-w-lg border-b border-border/80 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0.5 h-4 bg-rose-500/80" />
          </div>

          {/* Subtle status overlay */}
          <div className="absolute bottom-3 inset-x-6 flex items-center justify-between text-xs text-muted">
            <span>
              Kelime:{" "}
              <strong className="text-foreground">{currentIndex + 1}</strong> /{" "}
              {totalWords} (%{progressPercent})
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
