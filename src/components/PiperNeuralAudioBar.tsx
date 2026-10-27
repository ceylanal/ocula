"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Volume2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Cpu,
  CheckCircle2,
  Sparkles,
  Radio,
  Gauge,
} from "lucide-react";
import { TokenizedWord } from "@/lib/textUtils";
import {
  PIPER_VOICES,
  PiperVoiceId,
  SentenceChunk,
  buildSentenceChunks,
  detectPreferredVoice,
  findSentenceIndexForWord,
  getWordIndexAtProgress,
  isPiperWasmSupported,
  isVoiceModelCached,
  piperEngine,
  speakWithBrowserFallback,
  wpmToPlaybackRate,
} from "@/lib/piperAudioService";

interface PiperNeuralAudioBarProps {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  words: TokenizedWord[];
  currentWordIndex: number;
  wpm: number;
  autoRampEnabled: boolean;
  zenDimmed?: boolean;
  onPlayingStateChange?: (isPlaying: boolean) => void;
  onWordIndexSync: (wordIndex: number) => void;
  onWpmChange: (newWpm: number, rampNotice?: { from: number; to: number }) => void;
  onSessionSave: (stats: {
    wordIndex: number;
    wordsRead: number;
    durationSeconds: number;
    finalWpm: number;
  }) => void;
}

export function PiperNeuralAudioBar({
  bookId,
  bookTitle,
  bookAuthor,
  words,
  currentWordIndex,
  wpm,
  autoRampEnabled,
  zenDimmed = false,
  onPlayingStateChange,
  onWordIndexSync,
  onWpmChange,
  onSessionSave,
}: PiperNeuralAudioBarProps) {
  // Sentence chunks for the entire book
  const sentences = useMemo(() => buildSentenceChunks(words), [words]);

  // Detect default voice (tr_TR-dfki-medium for Turkish, en_US-lessac-medium for English)
  const defaultVoice = useMemo(() => {
    const sample = words
      .slice(0, 40)
      .map((w) => w.word)
      .join(" ");
    return detectPreferredVoice(sample);
  }, [words]);

  const [selectedVoice, setSelectedVoice] =
    useState<PiperVoiceId>(defaultVoice);
  const [engineMode, setEngineMode] = useState<"piper" | "fallback">("piper");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSynthesizingFirst, setIsSynthesizingFirst] =
    useState<boolean>(false);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [isModelCached, setIsModelCached] = useState<boolean>(false);
  const [prefetchedCount, setPrefetchedCount] = useState<number>(0);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const fallbackCancelRef = useRef<(() => void) | null>(null);

  // Prefetch queue cache: sentenceIndex -> Promise<{ blobUrl, durationSeconds }>
  const prefetchMapRef = useRef<
    Map<number, Promise<{ blobUrl: string; durationSeconds: number }>>
  >(new Map());
  const resolvedUrlsRef = useRef<Set<string>>(new Set());

  // Session telemetry refs for Auto-Ramp & pause saving
  const isPlayingRef = useRef<boolean>(false);
  const wpmRef = useRef<number>(wpm);
  const autoRampRef = useRef<boolean>(autoRampEnabled);
  const currentWordIndexRef = useRef<number>(currentWordIndex);
  const sessionStartMsRef = useRef<number | null>(null);
  const wordsSpokenInSessionRef = useRef<number>(0);
  const wordsSinceRampRef = useRef<number>(0);
  const secondsSinceRampRef = useRef<number>(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    onPlayingStateChange?.(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    wpmRef.current = wpm;
  }, [wpm]);

  useEffect(() => {
    autoRampRef.current = autoRampEnabled;
  }, [autoRampEnabled]);

  useEffect(() => {
    currentWordIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  // Update default voice when book changes
  useEffect(() => {
    setSelectedVoice(defaultVoice);
  }, [defaultVoice, bookId]);

  // Check if WebAssembly is supported and whether selected voice model is already cached in OPFS/CacheStorage
  useEffect(() => {
    if (!isPiperWasmSupported()) {
      setEngineMode("fallback");
      return;
    }
    isVoiceModelCached(selectedVoice).then((cached) => {
      setIsModelCached(cached);
    });
  }, [selectedVoice]);

  // Subscribe to Piper Worker download & model ready events
  useEffect(() => {
    const unsubProg = piperEngine.onDownloadProgress((prog) => {
      if (prog.voiceId === selectedVoice) {
        setDownloadPercent(prog.percent);
      }
    });
    const unsubReady = piperEngine.onModelReady((voiceId) => {
      if (voiceId === selectedVoice) {
        setDownloadPercent(null);
        setIsModelCached(true);
      }
    });
    return () => {
      unsubProg();
      unsubReady();
    };
  }, [selectedVoice]);

  // Keep activeSentenceIdx synced with currentWordIndex when audio is paused
  useEffect(() => {
    if (!isPlaying) {
      const sIdx = findSentenceIndexForWord(sentences, currentWordIndex);
      setActiveSentenceIdx(sIdx);
    }
  }, [currentWordIndex, sentences, isPlaying]);

  // Synchronize HTML5 <audio> playbackRate with live Ocula WPM (and Auto-Ramp)
  const playbackRate = useMemo(() => wpmToPlaybackRate(wpm), [wpm]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
    audio.preservesPitch = true;
    (
      audio as HTMLAudioElement & {
        mozPreservesPitch?: boolean;
        webkitPreservesPitch?: boolean;
      }
    ).mozPreservesPitch = true;
    (
      audio as HTMLAudioElement & {
        mozPreservesPitch?: boolean;
        webkitPreservesPitch?: boolean;
      }
    ).webkitPreservesPitch = true;
  }, [playbackRate, isPlaying]);

  // Clear prefetch cache when voice or book changes
  const clearPrefetchCache = () => {
    prefetchMapRef.current.clear();
    resolvedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    resolvedUrlsRef.current.clear();
    setPrefetchedCount(0);
  };

  useEffect(() => {
    return () => {
      stopAudioPlayback(true);
      clearPrefetchCache();
    };
  }, [bookId, selectedVoice]);

  // Prefetch helper: queues synthesis for sentence `sIdx` if not already in cache
  const getOrQueueSentenceAudio = (
    sIdx: number,
    voiceId: PiperVoiceId
  ): Promise<{ blobUrl: string; durationSeconds: number }> | null => {
    const sentence = sentences[sIdx];
    if (!sentence) return null;

    const existing = prefetchMapRef.current.get(sIdx);
    if (existing) return existing;

    const promise = piperEngine
      .synthesizeSentenceToWav(sentence.text, voiceId)
      .then((res) => {
        resolvedUrlsRef.current.add(res.blobUrl);
        setPrefetchedCount((c) => Math.min(2, c + 1));
        return res;
      })
      .catch((err) => {
        prefetchMapRef.current.delete(sIdx);
        throw err;
      });

    prefetchMapRef.current.set(sIdx, promise);
    return promise;
  };

  // Prefetch next 2 sentences (sIdx + 1 and sIdx + 2) in background
  const triggerBackgroundPrefetch = (
    currentSIdx: number,
    voiceId: PiperVoiceId
  ) => {
    setPrefetchedCount(0);
    for (let offset = 1; offset <= 2; offset++) {
      const targetIdx = currentSIdx + offset;
      if (targetIdx < sentences.length) {
        getOrQueueSentenceAudio(targetIdx, voiceId);
      }
    }
  };

  // Check Auto-Ramp after each sentence finishes
  const checkAutoRampStep = (
    wordsInSentence: number,
    durationSec: number
  ) => {
    wordsSpokenInSessionRef.current += wordsInSentence;
    wordsSinceRampRef.current += wordsInSentence;
    secondsSinceRampRef.current += durationSec;

    if (
      autoRampRef.current &&
      (wordsSinceRampRef.current >= 400 || secondsSinceRampRef.current >= 120)
    ) {
      wordsSinceRampRef.current = 0;
      secondsSinceRampRef.current = 0;
      const fromWpm = wpmRef.current;
      if (fromWpm < 1000) {
        const toWpm = Math.min(1000, fromWpm + 10);
        onWpmChange(toWpm, { from: fromWpm, to: toWpm });
      }
    }
  };

  // Play sentence `sIdx` using Piper Neural WAV (or Fallback if selected/errored)
  const playSentenceAtIndex = async (
    sIdx: number,
    modeOverride?: "piper" | "fallback"
  ) => {
    if (sIdx < 0 || sIdx >= sentences.length) {
      stopAudioPlayback(true);
      return;
    }

    const sentence = sentences[sIdx];
    setActiveSentenceIdx(sIdx);
    onWordIndexSync(sentence.startWordIndex);

    const activeMode = modeOverride || engineMode;

    // Update MediaSession metadata for Mobile Lock Screen
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${bookTitle} (Cümle #${sIdx + 1})`,
          artist: `${bookAuthor} • ${wpmRef.current} WPM`,
          album: "OkurLab • Piper Neural TTS",
        });
        navigator.mediaSession.playbackState = "playing";
      } catch {
        // Ignore on unsupported browsers
      }
    }

    if (activeMode === "fallback") {
      const voiceMeta = PIPER_VOICES.find((v) => v.id === selectedVoice);
      fallbackCancelRef.current?.();
      fallbackCancelRef.current = speakWithBrowserFallback({
        sentence,
        wpm: wpmRef.current,
        lang: voiceMeta?.lang || "tr-TR",
        onWordChange: (wIdx) => {
          onWordIndexSync(wIdx);
        },
        onEnd: () => {
          if (!isPlayingRef.current) return;
          const estSec = Math.max(
            1,
            (sentence.words.length / Math.max(120, wpmRef.current)) * 60
          );
          checkAutoRampStep(sentence.words.length, estSec);
          if (sIdx + 1 < sentences.length) {
            playSentenceAtIndex(sIdx + 1, "fallback");
          } else {
            stopAudioPlayback(true);
          }
        },
        onError: () => {
          stopAudioPlayback(true);
        },
      });
      return;
    }

    // PIPER NEURAL WASM / ONNX MODE
    try {
      setIsSynthesizingFirst(!prefetchMapRef.current.has(sIdx));
      const synthesisPromise = getOrQueueSentenceAudio(sIdx, selectedVoice);
      if (!synthesisPromise) return;

      // Start prefetching sIdx + 1 and sIdx + 2 in parallel!
      triggerBackgroundPrefetch(sIdx, selectedVoice);

      const { blobUrl, durationSeconds } = await synthesisPromise;
      setIsSynthesizingFirst(false);

      if (!isPlayingRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      audio.src = blobUrl;
      audio.playbackRate = wpmToPlaybackRate(wpmRef.current);
      audio.preservesPitch = true;

      // Smooth requestAnimationFrame word synchronization loop
      const updateWordSyncFromAudio = () => {
        if (!audio || audio.paused || !isPlayingRef.current) return;
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : durationSeconds;
        const ratio = Math.min(0.999, Math.max(0, audio.currentTime / dur));
        const wordIdx = getWordIndexAtProgress(sentence, ratio);
        onWordIndexSync(wordIdx);
        rafRef.current = requestAnimationFrame(updateWordSyncFromAudio);
      };

      audio.ontimeupdate = () => {
        if (!audio || audio.paused || !isPlayingRef.current) return;
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : durationSeconds;
        const ratio = Math.min(0.999, Math.max(0, audio.currentTime / dur));
        const wordIdx = getWordIndexAtProgress(sentence, ratio);
        onWordIndexSync(wordIdx);
      };

      audio.onended = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (!isPlayingRef.current) return;

        const realElapsedSec =
          durationSeconds / Math.max(0.5, audio.playbackRate);
        checkAutoRampStep(sentence.words.length, realElapsedSec);

        if (sIdx + 1 < sentences.length) {
          playSentenceAtIndex(sIdx + 1, "piper");
        } else {
          stopAudioPlayback(true);
        }
      };

      await audio.play();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateWordSyncFromAudio);
    } catch (err) {
      console.warn(
        "Piper Neural TTS hatası, yerleşik tarayıcı sesine (Fallback) geçiliyor:",
        err
      );
      setIsSynthesizingFirst(false);
      setEngineMode("fallback");
      setStatusMessage(
        "Cihazda WASM/Model başlatılamadı, yerleşik ses motoruna (Fallback) geçildi."
      );
      if (isPlayingRef.current) {
        playSentenceAtIndex(sIdx, "fallback");
      }
    }
  };

  const startAudioPlayback = () => {
    const startSIdx = findSentenceIndexForWord(
      sentences,
      currentWordIndexRef.current
    );
    setIsPlaying(true);
    isPlayingRef.current = true;
    sessionStartMsRef.current = Date.now();
    wordsSpokenInSessionRef.current = 0;
    setStatusMessage(null);
    playSentenceAtIndex(startSIdx);
  };

  const stopAudioPlayback = (saveSession = true) => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setIsSynthesizingFirst(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    fallbackCancelRef.current?.();
    fallbackCancelRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
    }

    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "paused";
      } catch {
        // Ignore
      }
    }

    if (saveSession && sessionStartMsRef.current) {
      const elapsedSec = Math.max(
        1,
        Math.round((Date.now() - sessionStartMsRef.current) / 1000)
      );
      sessionStartMsRef.current = null;
      if (wordsSpokenInSessionRef.current > 0 || elapsedSec >= 3) {
        onSessionSave({
          wordIndex: currentWordIndexRef.current,
          wordsRead: Math.max(5, wordsSpokenInSessionRef.current),
          durationSeconds: elapsedSec,
          finalWpm: wpmRef.current,
        });
      }
    }
  };

  const handleSkipSentence = (delta: number) => {
    const nextIdx = Math.max(
      0,
      Math.min(sentences.length - 1, activeSentenceIdx + delta)
    );
    setActiveSentenceIdx(nextIdx);
    const targetSentence = sentences[nextIdx];
    if (targetSentence) {
      onWordIndexSync(targetSentence.startWordIndex);
    }
    if (isPlayingRef.current) {
      playSentenceAtIndex(nextIdx);
    }
  };

  // Wire up Mobile Lock Screen MediaSession Controls (Play / Pause / Next / Prev)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.setActionHandler("play", () => {
        if (!isPlayingRef.current) startAudioPlayback();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        if (isPlayingRef.current) stopAudioPlayback(true);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        handleSkipSentence(-1);
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        handleSkipSentence(1);
      });
      navigator.mediaSession.setActionHandler("seekbackward", () => {
        handleSkipSentence(-1);
      });
      navigator.mediaSession.setActionHandler("seekforward", () => {
        handleSkipSentence(1);
      });
    } catch {
      // Ignore unsupported handlers
    }
  }, [activeSentenceIdx, sentences]);

  const currentSentence: SentenceChunk | undefined =
    sentences[activeSentenceIdx];

  return (
    <div
      className={`p-4 rounded-2xl bg-surface border border-border shadow-sm space-y-3 transition-opacity duration-500 ${
        zenDimmed && downloadPercent === null
          ? "opacity-15 hover:opacity-100"
          : "opacity-100"
      }`}
    >
      {/* Hidden HTML5 Audio Element for native mobile lock-screen & pitch-preserved playback */}
      <audio ref={audioRef} className="hidden" preload="auto" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Piper Neural TTS Brand & Play/Pause Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (isPlaying) {
                stopAudioPlayback(true);
              } else {
                startAudioPlayback();
              }
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all ${
              isPlaying
                ? "bg-[#96482B] hover:bg-[#783A24] text-[#F6F1E7]"
                : "bg-[#B85D3B] hover:bg-[#96482B] text-[#F6F1E7]"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Sesli Okumayı Duraklat</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Sesli Oku (Piper Neural AI)</span>
              </>
            )}
          </button>

          {/* Sentence Skip Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSkipSentence(-1)}
              className="p-2 rounded-xl bg-surface-elevated border border-border text-muted hover:text-foreground transition-colors"
              title="Önceki Cümle"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSkipSentence(1)}
              className="p-2 rounded-xl bg-surface-elevated border border-border text-muted hover:text-foreground transition-colors"
              title="Sonraki Cümle"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Voice Model Selector (Turkish DFKI / Fahrettin / English Lessac) */}
          <select
            value={selectedVoice}
            onChange={(e) => {
              const newVoice = e.target.value as PiperVoiceId;
              const wasPlaying = isPlayingRef.current;
              stopAudioPlayback(false);
              clearPrefetchCache();
              setSelectedVoice(newVoice);
              if (wasPlaying) {
                setTimeout(() => startAudioPlayback(), 80);
              }
            }}
            className="px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-foreground focus:outline-none focus:border-indigo-500"
            title="Piper Nöral Ses Modeli Seçin"
          >
            {PIPER_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Telemetry Badges (WPM -> PlaybackRate, Prefetch Status, Engine Mode) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* WPM <-> Audio Speed Sync Badge */}
          <span
            className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold tabular-nums flex items-center gap-1.5"
            title="playbackRate = Math.min(Math.max(wpm / 150, 0.5), 3.0) • preservesPitch = true"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>
              {wpm} WPM &rarr; {playbackRate}x Ses Hızı
            </span>
          </span>

          {/* Prefetch Queue Status Badge */}
          {engineMode === "piper" && (
            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold tabular-nums flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>
                {isModelCached
                  ? `Cihazda Hazır • Prefetch: +${prefetchedCount} Cümle`
                  : "WebAssembly ONNX"}
              </span>
            </span>
          )}

          {/* Engine Mode Switcher (Piper Neural WASM vs Browser Fallback) */}
          <button
            type="button"
            onClick={() => {
              const nextMode = engineMode === "piper" ? "fallback" : "piper";
              const wasPlaying = isPlayingRef.current;
              stopAudioPlayback(false);
              setEngineMode(nextMode);
              if (wasPlaying) {
                setTimeout(() => {
                  setIsPlaying(true);
                  isPlayingRef.current = true;
                  playSentenceAtIndex(activeSentenceIdx, nextMode);
                }, 60);
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl border font-semibold flex items-center gap-1 transition-all ${
              engineMode === "piper"
                ? "bg-surface-elevated border-border text-muted hover:text-foreground"
                : "bg-amber-500/15 border-amber-500/40 text-amber-400"
            }`}
            title="Piper Nöral WASM motoru ile yerleşik tarayıcı sesi (Fallback) arasında geçiş yap"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>
              {engineMode === "piper" ? "Mod: Piper Nöral" : "Mod: Yerleşik Ses (Fallback)"}
            </span>
          </button>
        </div>
      </div>

      {/* First-Time Model Download Progress Bar (OPFS / CacheStorage) */}
      {downloadPercent !== null && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-indigo-400 flex items-center gap-1.5">
              <Download className="w-4 h-4 animate-bounce" />
              <span>
                Nöral Ses Modeli Cihaza İndiriliyor: %{downloadPercent} — Sadece
                ilk seferde indirilir (OPFS Önbellek)
              </span>
            </span>

            <button
              type="button"
              onClick={() => {
                setEngineMode("fallback");
                if (isPlayingRef.current) {
                  playSentenceAtIndex(activeSentenceIdx, "fallback");
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-semibold text-foreground hover:border-indigo-500"
            >
              İnerken Yerleşik Sesle Dinle &rarr;
            </button>
          </div>

          <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-200"
              style={{ width: `${Math.max(4, downloadPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Active Sentence & Pacer Synchronization Subtitle Strip */}
      {(isPlaying || isSynthesizingFirst || statusMessage) && (
        <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated/70 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate text-foreground font-medium">
              {isSynthesizingFirst
                ? "1. cümle nöral ağda sentezleniyor (.wav)..."
                : statusMessage ||
                  (currentSentence
                    ? `Cümle #${activeSentenceIdx + 1}/${sentences.length}: "${currentSentence.text}"`
                    : "Sesli okuma hazır")}
            </span>
          </div>
          <span className="text-[11px] text-muted shrink-0 tabular-nums flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pacer &amp; Kilit Ekranı Senkronize</span>
          </span>
        </div>
      )}
    </div>
  );
}
