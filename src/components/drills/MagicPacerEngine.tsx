"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Gauge,
  EyeOff,
  Sparkles,
  CheckCircle2,
  SkipBack,
  SkipForward,
  TrendingUp,
} from "lucide-react";
import { tokenizeParagraphs } from "@/lib/textUtils";

interface MagicPacerEngineProps {
  paragraphs: string[];
  initialWordIndex?: number;
  initialWpm?: number;
  fontClass?: string;
  fontSize?: number;
  lineHeight?: number;
  autoRampEnabled?: boolean;
  zenDimmed?: boolean;
  externalAudioPlaying?: boolean;
  onPlayingStateChange?: (isPlaying: boolean) => void;
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
}

type MaskIntensity = "soft" | "blur" | "strict";

export function MagicPacerEngine({
  paragraphs,
  initialWordIndex = 0,
  initialWpm = 320,
  fontClass = "font-serif",
  fontSize = 19,
  lineHeight = 1.9,
  autoRampEnabled = false,
  zenDimmed = false,
  externalAudioPlaying = false,
  onPlayingStateChange,
  onToggleAutoRamp,
  onWordIndexChange,
  onSessionSave,
  onFinishSession,
}: MagicPacerEngineProps) {
  const { words, paragraphsOfWords } = useMemo(
    () => tokenizeParagraphs(paragraphs),
    [paragraphs]
  );
  const totalWords = words.length;

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialWordIndex, Math.max(0, totalWords - 1))
  );
  const [wpm, setWpm] = useState(initialWpm);
  const [spanSize, setSpanSize] = useState<1 | 3 | 5>(3);
  const [maskMode, setMaskMode] = useState<MaskIntensity>("blur");
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rampNotification, setRampNotification] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [lastSavedToast, setLastSavedToast] = useState<string | null>(null);

  const activeWordElRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledLineOffsetRef = useRef<number>(-1);
  const isExternalSyncRef = useRef<boolean>(false);
  const sessionStartRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef<number>(0);
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
    onPlayingStateChange?.(isPlaying);
  }, [currentIndex, wpm, isPlaying]);

  // If external Audio starts playing, pause internal Pacer timer so Audio drives word position cleanly
  useEffect(() => {
    if (externalAudioPlaying && isPlaying) {
      setIsPlaying(false);
    }
  }, [externalAudioPlaying, isPlaying]);

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

  useEffect(() => {
    return () => {
      flushSessionSave("unmount");
    };
  }, []);

  useEffect(() => {
    if (!rampNotification) return;
    const t = setTimeout(() => setRampNotification(null), 4500);
    return () => clearTimeout(t);
  }, [rampNotification]);

  useEffect(() => {
    if (!lastSavedToast) return;
    const t = setTimeout(() => setLastSavedToast(null), 3500);
    return () => clearTimeout(t);
  }, [lastSavedToast]);

  // Sync external initialWpm when updated from Audio Bar or parent
  useEffect(() => {
    if (initialWpm && initialWpm >= 90 && initialWpm <= 1000 && initialWpm !== wpm) {
      isExternalSyncRef.current = true;
      setWpm(initialWpm);
    }
  }, [initialWpm]);

  // Reset only when the actual text/book changes
  useEffect(() => {
    isExternalSyncRef.current = true;
    setCurrentIndex(Math.min(initialWordIndex, Math.max(0, totalWords - 1)));
    setIsPlaying(false);
    setCompleted(false);
  }, [paragraphs, totalWords]);

  // Follow initialWordIndex whenever Pacer's internal timer is paused (including during Audio playback!)
  useEffect(() => {
    if (!isPlaying) {
      const clamped = Math.min(initialWordIndex, Math.max(0, totalWords - 1));
      if (clamped !== currentIndex) {
        isExternalSyncRef.current = true;
        setCurrentIndex(clamped);
      }
    }
  }, [initialWordIndex, totalWords, isPlaying]);

  useEffect(() => {
    if (isExternalSyncRef.current) {
      isExternalSyncRef.current = false;
      return;
    }
    onWordIndexChange?.(currentIndex, wpm);
  }, [currentIndex, wpm]);

  // Continuous line-by-line auto-scroll for both inner container and browser window
  useEffect(() => {
    if (!activeWordElRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const el = activeWordElRef.current;

    const lineOffset = el.offsetTop;
    const lineChanged = Math.abs(lineOffset - lastScrolledLineOffsetRef.current) > 8;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const relativeTop = elRect.top - containerRect.top;

    // 1) Scroll the Pacer inner container smoothly whenever the active line moves outside the 28%..46% sweet spot
    if (
      lineChanged &&
      (relativeTop < container.clientHeight * 0.26 ||
        relativeTop > container.clientHeight * 0.44)
    ) {
      lastScrolledLineOffsetRef.current = lineOffset;
      const targetScrollTop =
        container.scrollTop + relativeTop - container.clientHeight * 0.35;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });
    }

    // 2) Also ensure the browser window itself keeps the active word comfortably visible on screen during Audio or Pacer playback
    if (
      (isPlaying || externalAudioPlaying) &&
      typeof window !== "undefined" &&
      lineChanged
    ) {
      const viewportHeight = window.innerHeight;
      if (elRect.top < 120 || elRect.bottom > viewportHeight - 120) {
        const targetWindowY =
          window.scrollY + elRect.top - viewportHeight * 0.38;
        window.scrollTo({
          top: Math.max(0, targetWindowY),
          behavior: "smooth",
        });
      }
    }
  }, [currentIndex, isPlaying, externalAudioPlaying]);

  // Timer loop for Magic Pacer progression + Auto-Ramp (+10 WPM per 400 words or 120s)
  useEffect(() => {
    if (!isPlaying || totalWords === 0) {
      flushSessionSave("pause");
      return;
    }

    if (!sessionStartRef.current) {
      sessionStartRef.current = Date.now();
    }

    const intervalMs = Math.max(55, Math.round((60000 / wpm) * spanSize));

    const timer = setInterval(() => {
      unsavedWordsRef.current += spanSize;
      wordsSinceRampRef.current += spanSize;
      secondsSinceRampRef.current += intervalMs / 1000;

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
        const next = prev + spanSize;
        if (next >= totalWords) {
          setIsPlaying(false);
          setCompleted(true);
          const extraSec = sessionStartRef.current
            ? (Date.now() - sessionStartRef.current) / 1000
            : 0;
          sessionStartRef.current = null;
          onFinishSession?.({
            wpm,
            durationSeconds: Math.max(
              3,
              Math.round(accumulatedSecondsRef.current + extraSec)
            ),
            wordsRead: totalWords,
          });
          return totalWords - 1;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, wpm, spanSize, totalWords, autoRampEnabled, onFinishSession]);

  // Keyboard shortcuts (Space to play/pause, arrows for WPM & seek)
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
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(totalWords - 1, i + spanSize));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - spanSize));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [spanSize, totalWords]);

  const activeParagraphIndex = words[currentIndex]?.paragraphIndex ?? 0;
  const progressPercent =
    totalWords > 1 ? Math.round((currentIndex / (totalWords - 1)) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Control Bar (fades softly in Zen Reading Mode) */}
      <div
        className={`p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-4 transition-opacity duration-500 ${
          zenDimmed ? "opacity-15 hover:opacity-100" : "opacity-100"
        }`}
      >
        {/* WPM Control */}
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="w-9 h-9 rounded-xl bg-[#B85D3B]/10 border border-[#B85D3B]/25 flex items-center justify-center text-[#B85D3B] shrink-0">
            <Gauge className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted font-medium">Pacer Hızı</span>
              <span className="font-bold text-[#B85D3B]">{wpm} WPM</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWpm((w) => Math.max(100, w - 25))}
                className="px-2 py-0.5 text-xs rounded bg-surface-elevated border border-border hover:border-[#B85D3B]/40"
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
                className="w-full accent-[#B85D3B] cursor-pointer h-1.5 rounded-lg"
              />
              <button
                onClick={() => setWpm((w) => Math.min(1000, w + 25))}
                className="px-2 py-0.5 text-xs rounded bg-surface-elevated border border-border hover:border-[#B85D3B]/40"
              >
                +25
              </button>
            </div>
          </div>
        </div>

        {/* Focus Block Width */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Odak Bloğu:</span>
          <div className="flex rounded-xl bg-surface-elevated p-1 border border-border">
            {([1, 3, 5] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setSpanSize(sz)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  spanSize === sz
                    ? "bg-[#B85D3B] text-[#F6F1E7]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {sz} Kelime
              </button>
            ))}
          </div>
        </div>

        {/* Blur / Masking Mode */}
        <div className="flex items-center gap-2">
          <EyeOff className="w-3.5 h-3.5 text-muted" />
          <div className="flex rounded-xl bg-surface-elevated p-1 border border-border">
            {(
              [
                { id: "soft", label: "Hafif" },
                { id: "blur", label: "Bulanık (Blur)" },
                { id: "strict", label: "Tam Maske" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMaskMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  maskMode === m.id
                    ? "bg-[#B85D3B] text-[#F6F1E7]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transport Controls: Reset / Back / Play-Pause / Forward */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex(0);
              setCompleted(false);
              containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="p-2.5 rounded-xl bg-surface-elevated border border-border text-muted hover:text-foreground transition-colors"
            title="Başa Dön"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setCurrentIndex((i) => Math.max(0, i - spanSize * 2))
            }
            className="p-2.5 rounded-xl bg-surface-elevated border border-border text-muted hover:text-foreground transition-colors"
            title="Geri Al"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (currentIndex >= totalWords - 1) setCurrentIndex(0);
              setCompleted(false);
              setIsPlaying((p) => !p);
            }}
            className="px-5 py-2.5 rounded-xl bg-[#B85D3B] hover:bg-[#96482B] text-[#F6F1E7] text-sm font-semibold flex items-center gap-2 shadow-md shadow-[#B85D3B]/20 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Duraklat</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Pacer Başlat</span>
              </>
            )}
          </button>
          <button
            onClick={() =>
              setCurrentIndex((i) =>
                Math.min(totalWords - 1, i + spanSize * 2)
              )
            }
            className="p-2.5 rounded-xl bg-surface-elevated border border-border text-muted hover:text-foreground transition-colors"
            title="İleri Al"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full-Page Pacer Document Viewport */}
      <div className="rounded-3xl bg-background border-2 border-border overflow-hidden shadow-lg">
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-surface-elevated">
          <div
            className="h-full bg-gradient-to-r from-[#B85D3B] to-[#5C6B57] transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className={`px-6 py-3 bg-surface/60 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted transition-opacity duration-500 ${
            zenDimmed ? "opacity-25 hover:opacity-100" : "opacity-100"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#B85D3B]" />
              Herhangi bir kelimeye tıklayarak odak çerçevesini o noktaya
              taşıyabilirsiniz (Boşluk tuşu: Başlat/Duraklat).
            </span>
            {autoRampEnabled && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#5C6B57]/15 border border-[#5C6B57]/30 text-[#5C6B57] font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Auto-Ramp (+10 WPM / 400 kelime)</span>
              </span>
            )}
            {rampNotification && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#B85D3B]/15 border border-[#B85D3B]/35 text-[#B85D3B] font-bold animate-pulse">
                ⚡ Hız İvmesi: {rampNotification.from} &rarr;{" "}
                {rampNotification.to} WPM
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastSavedToast && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#B85D3B]/15 border border-[#B85D3B]/35 text-[#B85D3B] font-semibold">
                {lastSavedToast}
              </span>
            )}
            <span>
              İlerleme:{" "}
              <strong className="text-foreground">%{progressPercent}</strong> (
              {currentIndex + 1}/{totalWords})
            </span>
          </div>
        </div>

        <div
          ref={containerRef}
          className={`max-h-[520px] overflow-y-auto p-6 sm:p-10 space-y-6 ${fontClass}`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
          }}
        >
          {paragraphsOfWords.map((paraWords, pIdx) => {
            const isParaActive = pIdx === activeParagraphIndex;

            // Paragraph-level masking (prevents per-word GPU blur glitches)
            let paragraphStyleClass =
              "transition-opacity duration-200 rounded-2xl p-3.5 -mx-3.5";
            if (!isParaActive) {
              if (maskMode === "strict") {
                paragraphStyleClass +=
                  " blur-[4px] opacity-15 select-none";
              } else if (maskMode === "blur") {
                paragraphStyleClass += " blur-[2px] opacity-30";
              } else {
                paragraphStyleClass += " opacity-45";
              }
            } else {
              paragraphStyleClass +=
                " opacity-100 bg-surface/55 border border-border/70";
            }

            return (
              <p key={pIdx} className={paragraphStyleClass}>
                {paraWords.map((token) => {
                  const isFocused =
                    token.globalIndex >= currentIndex &&
                    token.globalIndex < currentIndex + spanSize;
                  const isFirstFocused = token.globalIndex === currentIndex;
                  const isPast = token.globalIndex < currentIndex;

                  // Pacer (Odak Bloğu) Kelime Vurgusu:
                  // #E6D2B5 arka plan üzerinde #2C2520 metin ve altında ince #B85D3B çizgi (.okurlab-pacer-focus)
                  let wordAppearance = "";
                  if (isFocused) {
                    wordAppearance = "okurlab-pacer-focus";
                  } else if (isParaActive) {
                    if (maskMode === "strict") {
                      wordAppearance = isPast
                        ? "opacity-20 blur-[1.5px]"
                        : "opacity-25 blur-[1.5px]";
                    } else if (maskMode === "blur") {
                      wordAppearance = isPast ? "opacity-35" : "opacity-55";
                    } else {
                      wordAppearance = isPast ? "opacity-45" : "opacity-80";
                    }
                  }

                  return (
                    <React.Fragment key={token.globalIndex}>
                      <span
                        ref={isFirstFocused ? activeWordElRef : null}
                        onClick={() => setCurrentIndex(token.globalIndex)}
                        className={`rounded px-1 py-0.5 -mx-0.5 cursor-pointer transition-colors duration-75 ${wordAppearance}`}
                      >
                        {token.word}
                      </span>{" "}
                    </React.Fragment>
                  );
                })}
              </p>
            );
          })}
        </div>
      </div>

      {completed && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-sm">
                Magic Pacer Egzersizi Tamamlandı!
              </div>
              <div className="text-xs text-muted">
                Geriye dönüş (regresyon) yapmadan{" "}
                <strong className="text-emerald-400">{wpm} WPM</strong> hızında
                tüm metni taradınız.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setCompleted(false);
              containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors"
          >
            Başa Sar
          </button>
        </div>
      )}
    </div>
  );
}
