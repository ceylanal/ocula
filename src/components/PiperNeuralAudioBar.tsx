"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Volume2,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  CheckCircle2,
  Sparkles,
  Radio,
  Gauge,
  Minus,
  Plus,
  LocateFixed,
} from "lucide-react";
import { TokenizedWord } from "@/lib/textUtils";
import {
  AUDIO_SPEED_PRESETS,
  PIPER_VOICES,
  PiperVoiceId,
  SentenceChunk,
  buildSentenceChunks,
  detectPreferredVoice,
  findSentenceIndexForWord,
  getWordIndexAtProgress,
  isPiperWasmSupported,
  piperEngine,
  speakWithBrowserFallback,
  wpmToPlaybackRate,
} from "@/lib/piperAudioService";

/**
 * Mobil tarayıcılar (özellikle iOS Safari) `audio.play()` çağrısını yalnızca kullanıcı
 * dokunuşu sırasında senkron başlatılırsa serbest bırakır. Sentez bittikten sonra
 * (asenkron) yapılan çağrı reddedilir. Dokunuş anında sessiz bir ses çalıp öğeyi
 * "açarız"; sonraki programatik çalmalar izinli olur.
 */
const SILENT_WAV = "data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/**
 * iOS Safari, ses hızı 2x'in üstüne çıkınca sesi susturabilir. iOS'ta oynatma hızı 2.0 ile
 * sınırlanır; yazılı WPM değişmez, yalnızca sesin hızlanması bu eşikte durur.
 */
function getMaxPlaybackRate(): number {
  if (typeof navigator === "undefined") return 3.0;
  const isIOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIOS ? 2.0 : 3.0;
}

/** Medya özelliklerini ayarlar; desteklenmeyen değer/tarayıcı uygulamayı çökertmesin. */
function setMediaRate(audio: HTMLAudioElement, rate: number): void {
  const safeRate = Math.min(rate, getMaxPlaybackRate());
  try {
    audio.defaultPlaybackRate = safeRate;
    if (Math.abs(audio.playbackRate - safeRate) > 0.01) {
      audio.playbackRate = safeRate;
    }
    audio.preservesPitch = true;
    const legacy = audio as HTMLAudioElement & {
      mozPreservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    legacy.mozPreservesPitch = true;
    legacy.webkitPreservesPitch = true;
  } catch (err) {
    console.warn("Oynatma hızı uygulanamadı:", err);
  }
}

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
  onWpmChange: (
    newWpm: number,
    rampNotice?: { from: number; to: number }
  ) => void;
  onSessionSave: (stats: {
    wordIndex: number;
    wordsRead: number;
    durationSeconds: number;
    finalWpm: number;
  }) => void;
  onCenterActiveWord?: () => void;
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
  onCenterActiveWord,
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
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ses döngüsü (rAF, audio olayları) eski render'larda oluşturulan kapanışlar içinde çalışır.
  // Üst bileşenin güncel callback'lerini ref üzerinden çağırmak, bayat WPM/mod değerlerinin
  // hız ayarını geri sarmasını önler.
  const callbacksRef = useRef({
    onPlayingStateChange,
    onWordIndexSync,
    onWpmChange,
    onSessionSave,
  });
  callbacksRef.current = {
    onPlayingStateChange,
    onWordIndexSync,
    onWpmChange,
    onSessionSave,
  };

  // Her oynatma/durdurma bir sonraki jetona geçer; beklemedeki (sentez, play) işlemler
  // jeton değiştiyse sonuçlarını yok sayar.
  const playTokenRef = useRef<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const rafRef = useRef<number | null>(null);
  const fallbackCancelRef = useRef<(() => void) | null>(null);
  const fallbackSpeedRestartTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  // Deduplicate word sync calls so we only notify parent when the spoken word actually changes
  const lastSyncedWordIdxRef = useRef<number>(-1);

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
  const activeSentenceIdxRef = useRef<number>(activeSentenceIdx);
  const engineModeRef = useRef<"piper" | "fallback">(engineMode);
  const sessionStartMsRef = useRef<number | null>(null);
  const wordsSpokenInSessionRef = useRef<number>(0);
  const wordsSinceRampRef = useRef<number>(0);
  const secondsSinceRampRef = useRef<number>(0);

  const emitWordSyncIfNeeded = (wordIdx: number) => {
    if (wordIdx !== lastSyncedWordIdxRef.current) {
      lastSyncedWordIdxRef.current = wordIdx;
      currentWordIndexRef.current = wordIdx;
      callbacksRef.current.onWordIndexSync(wordIdx);
    }
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    callbacksRef.current.onPlayingStateChange?.(isPlaying);
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

  useEffect(() => {
    activeSentenceIdxRef.current = activeSentenceIdx;
  }, [activeSentenceIdx]);

  useEffect(() => {
    engineModeRef.current = engineMode;
  }, [engineMode]);

  // Update default voice when book changes
  useEffect(() => {
    setSelectedVoice(defaultVoice);
  }, [defaultVoice, bookId]);

  // Tarayıcı çevrimdışı sesi (WebAssembly) desteklemiyorsa cihazın kendi sesine geç
  useEffect(() => {
    if (!isPiperWasmSupported()) {
      setEngineMode("fallback");
    }
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

  // Synchronize HTML5 <audio> playbackRate with live OkurLab WPM (and Auto-Ramp)
  const playbackRate = useMemo(() => wpmToPlaybackRate(wpm), [wpm]);

  // Yeni kaynak yüklenince bazı tarayıcılar (Safari/mobil) playbackRate'i varsayılana sıfırlar;
  // defaultPlaybackRate'i de ayarlayıp oran sapmışsa düzeltiriz.
  const applyPlaybackRate = (audio: HTMLAudioElement) =>
    setMediaRate(audio, wpmToPlaybackRate(wpmRef.current));

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) setMediaRate(audio, playbackRate);

    // If playing in Browser Fallback mode, smoothly apply the new speed from the current word
    if (isPlayingRef.current && engineModeRef.current === "fallback") {
      if (fallbackSpeedRestartTimerRef.current) {
        clearTimeout(fallbackSpeedRestartTimerRef.current);
      }
      fallbackSpeedRestartTimerRef.current = setTimeout(() => {
        if (isPlayingRef.current && engineModeRef.current === "fallback") {
          playSentenceAtIndex(
            activeSentenceIdxRef.current,
            "fallback",
            currentWordIndexRef.current
          );
        }
      }, 160);
    }
  }, [playbackRate, isPlaying]);

  // Clear prefetch cache when voice or book changes
  const clearPrefetchCache = () => {
    prefetchMapRef.current.clear();
    resolvedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    resolvedUrlsRef.current.clear();
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
      if (fromWpm < 600) {
        const toWpm = Math.min(600, fromWpm + 10);
        callbacksRef.current.onWpmChange(toWpm, { from: fromWpm, to: toWpm });
      }
    }
  };

  // Play sentence `sIdx` using Piper Neural WAV (or Fallback if selected/errored)
  const playSentenceAtIndex = async (
    sIdx: number,
    modeOverride?: "piper" | "fallback",
    resumeFromWordIndex?: number
  ) => {
    if (sIdx < 0 || sIdx >= sentences.length) {
      stopAudioPlayback(true);
      return;
    }

    const token = ++playTokenRef.current;
    const sentence = sentences[sIdx];
    setActiveSentenceIdx(sIdx);
    activeSentenceIdxRef.current = sIdx;

    const initialWordIdx =
      typeof resumeFromWordIndex === "number" &&
      resumeFromWordIndex >= sentence.startWordIndex &&
      resumeFromWordIndex <= sentence.endWordIndex
        ? resumeFromWordIndex
        : sentence.startWordIndex;

    emitWordSyncIfNeeded(initialWordIdx);

    const activeMode = modeOverride || engineModeRef.current;

    // Update MediaSession metadata for Mobile Lock Screen
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${bookTitle} (Cümle #${sIdx + 1})`,
          artist: `${bookAuthor} • ${wpmRef.current} WPM (${wpmToPlaybackRate(
            wpmRef.current
          )}x)`,
          album: "OkurLab",
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
        fromGlobalWordIndex: initialWordIdx,
        onWordChange: (wIdx) => {
          emitWordSyncIfNeeded(wIdx);
        },
        onEnd: () => {
          if (!isPlayingRef.current) return;
          const estSec = Math.max(
            1,
            (sentence.words.length / Math.max(90, wpmRef.current)) * 60
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
      if (token !== playTokenRef.current) return;
      setIsSynthesizingFirst(false);

      if (!isPlayingRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      audio.src = blobUrl;
      audio.onloadedmetadata = () => applyPlaybackRate(audio);
      applyPlaybackRate(audio);

      // Smooth requestAnimationFrame word synchronization loop (deduplicated)
      const updateWordSyncFromAudio = () => {
        if (!audio || audio.paused || !isPlayingRef.current) return;
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : durationSeconds;
        const ratio = Math.min(0.999, Math.max(0, audio.currentTime / dur));
        const wordIdx = getWordIndexAtProgress(sentence, ratio);
        emitWordSyncIfNeeded(wordIdx);
        rafRef.current = requestAnimationFrame(updateWordSyncFromAudio);
      };

      audio.ontimeupdate = () => {
        if (!audio || audio.paused || !isPlayingRef.current) return;
        applyPlaybackRate(audio);
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : durationSeconds;
        const ratio = Math.min(0.999, Math.max(0, audio.currentTime / dur));
        const wordIdx = getWordIndexAtProgress(sentence, ratio);
        emitWordSyncIfNeeded(wordIdx);
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
      if (token !== playTokenRef.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateWordSyncFromAudio);
    } catch (err) {
      // Duraklatma/atlama sırasında yarıda kesilen play() bir hata değildir; motor değiştirilmez.
      if (
        token !== playTokenRef.current ||
        (err instanceof DOMException && err.name === "AbortError")
      ) {
        return;
      }
      console.warn(
        "Piper Neural TTS hatası, yerleşik tarayıcı sesine (Fallback) geçiliyor:",
        err
      );
      setIsSynthesizingFirst(false);
      setEngineMode("fallback");
      engineModeRef.current = "fallback";
      setStatusMessage(
        "Doğal ses bu cihazda başlatılamadı; cihazın kendi sesi kullanılıyor."
      );
      if (isPlayingRef.current) {
        playSentenceAtIndex(sIdx, "fallback", initialWordIdx);
      }
    }
  };

  const startAudioPlayback = () => {
    // Kullanıcı dokunuşu sırasında ses öğesini aç (mobil autoplay politikası)
    const audio = audioRef.current;
    if (audio && engineModeRef.current === "piper") {
      audio.src = SILENT_WAV;
      audio.play().catch(() => {});
    }
    setHasStarted(true);
    const startSIdx = findSentenceIndexForWord(
      sentences,
      currentWordIndexRef.current
    );
    setIsPlaying(true);
    isPlayingRef.current = true;
    sessionStartMsRef.current = Date.now();
    wordsSpokenInSessionRef.current = 0;
    setStatusMessage(null);
    playSentenceAtIndex(startSIdx, undefined, currentWordIndexRef.current);
  };

  const stopAudioPlayback = (saveSession = true) => {
    playTokenRef.current++;
    setIsPlaying(false);
    isPlayingRef.current = false;
    setIsSynthesizingFirst(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (fallbackSpeedRestartTimerRef.current) {
      clearTimeout(fallbackSpeedRestartTimerRef.current);
      fallbackSpeedRestartTimerRef.current = null;
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
        callbacksRef.current.onSessionSave({
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
    activeSentenceIdxRef.current = nextIdx;
    const targetSentence = sentences[nextIdx];
    if (targetSentence) {
      emitWordSyncIfNeeded(targetSentence.startWordIndex);
    }
    if (isPlayingRef.current) {
      playSentenceAtIndex(nextIdx);
    }
  };

  const handleAdjustWpm = (nextWpm: number) => {
    const clamped = Math.min(600, Math.max(90, Math.round(nextWpm)));
    wpmRef.current = clamped;
    callbacksRef.current.onWpmChange(clamped);
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
    <>
    <div
      className={`p-4 rounded-2xl bg-surface border border-border shadow-sm space-y-3.5 transition-opacity duration-500 ${
        zenDimmed && downloadPercent === null
          ? "opacity-20 hover:opacity-100"
          : "opacity-100"
      }`}
    >
      {/* Hidden HTML5 Audio Element for native mobile lock-screen & pitch-preserved playback */}
      <audio ref={audioRef} className="hidden" preload="auto" />

      {/* Row 1: Play/Pause, Sentence Skip, Voice Selector, and Engine Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
                <span>Duraklat</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Sesli Oku</span>
              </>
            )}
          </button>

          {/* Sentence Skip Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSkipSentence(-1)}
              className="p-2 rounded-xl bg-background border border-border text-muted hover:text-foreground transition-colors"
              title="Önceki Cümle"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSkipSentence(1)}
              className="p-2 rounded-xl bg-background border border-border text-muted hover:text-foreground transition-colors"
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
            className="px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:border-[#B85D3B]"
            title="Ses seç"
          >
            {PIPER_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Prefetch Badge, Re-center Page Button, Engine Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {onCenterActiveWord && (
            <button
              type="button"
              onClick={onCenterActiveWord}
              className="px-2.5 py-1.5 rounded-xl bg-background border border-border hover:border-[#B85D3B] text-foreground font-semibold flex items-center gap-1.5 transition-all"
              title="Okunan cümleyi ekranda ortala"
            >
              <LocateFixed className="w-3.5 h-3.5 text-[#B85D3B]" />
              <span>Satırı Ortala</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const nextMode = engineMode === "piper" ? "fallback" : "piper";
              const wasPlaying = isPlayingRef.current;
              stopAudioPlayback(false);
              setEngineMode(nextMode);
              engineModeRef.current = nextMode;
              if (wasPlaying) {
                setTimeout(() => {
                  setIsPlaying(true);
                  isPlayingRef.current = true;
                  playSentenceAtIndex(
                    activeSentenceIdx,
                    nextMode,
                    currentWordIndexRef.current
                  );
                }, 60);
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl border font-semibold flex items-center gap-1 transition-all ${
              engineMode === "piper"
                ? "bg-background border-border text-muted hover:text-foreground"
                : "bg-[#B85D3B]/15 border-[#B85D3B]/40 text-[#B85D3B]"
            }`}
            title="Doğal ses yavaş ya da çalışmıyorsa cihazın kendi sesini kullan"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>
              {engineMode === "piper" ? "Cihaz sesini kullan" : "Doğal sese dön"}
            </span>
          </button>
        </div>
      </div>

      {/* Row 2: Dedicated Audio & Reading Speed Control Strip (Slider + -/+15 WPM + 0.75x..2.5x Presets) */}
      <div className="p-3 rounded-2xl bg-background/85 border border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: WPM & Multiplier Readout + Fine Slider */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1">
          <div className="px-3 py-1.5 rounded-xl bg-[#B85D3B]/15 border border-[#B85D3B]/35 text-[#B85D3B] font-bold text-xs tabular-nums flex items-center gap-1.5 shrink-0">
            <Gauge className="w-3.5 h-3.5" />
            <span>{wpm} WPM</span>
            <span className="text-[#2C2520]/70">•</span>
            <span className="bg-[#B85D3B] text-[#F6F1E7] px-1.5 py-0.5 rounded text-[11px]">
              {playbackRate.toFixed(2)}x
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <button
              type="button"
              onClick={() => handleAdjustWpm(wpm - 15)}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-[#B85D3B] text-xs font-bold text-foreground flex items-center gap-0.5 shrink-0 transition-colors"
              title="Hızı 15 WPM (0.1x) Azalt"
            >
              <Minus className="w-3 h-3" />
              <span>15</span>
            </button>

            <input
              type="range"
              min={90}
              max={450}
              step={5}
              value={Math.min(450, Math.max(90, wpm))}
              onChange={(e) => handleAdjustWpm(Number(e.target.value))}
              className="w-full accent-[#B85D3B] cursor-pointer h-2 rounded-lg"
              aria-label="Sesli Okuma Hızı (WPM)"
            />

            <button
              type="button"
              onClick={() => handleAdjustWpm(wpm + 15)}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-[#B85D3B] text-xs font-bold text-foreground flex items-center gap-0.5 shrink-0 transition-colors"
              title="Hızı 15 WPM (0.1x) Artır"
            >
              <Plus className="w-3 h-3" />
              <span>15</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Speed Multiplier Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-muted mr-1">
            Hızlı Seçim:
          </span>
          {AUDIO_SPEED_PRESETS.map((preset) => {
            const isSelected = Math.abs(wpm - preset.wpm) <= 8;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleAdjustWpm(preset.wpm)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  isSelected
                    ? "bg-[#B85D3B] text-[#F6F1E7] border-[#B85D3B] shadow-sm"
                    : "bg-surface border-border text-muted hover:text-foreground hover:border-[#B85D3B]/40"
                }`}
                title={`${preset.wpm} WPM (${preset.label} Ses Hızı)`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* First-Time Model Download Progress Bar (OPFS / CacheStorage) */}
      {downloadPercent !== null && (
        <div className="p-3.5 rounded-2xl bg-[#B85D3B]/10 border border-[#B85D3B]/35 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#B85D3B] flex items-center gap-1.5">
              <Download className="w-4 h-4 animate-bounce" />
              <span>
                Ses ilk kullanımda indiriliyor: %{downloadPercent}. Bir kez iner,
                sonra internet olmadan çalışır.
              </span>
            </span>

            <button
              type="button"
              onClick={() => {
                setEngineMode("fallback");
                engineModeRef.current = "fallback";
                if (isPlayingRef.current) {
                  playSentenceAtIndex(
                    activeSentenceIdx,
                    "fallback",
                    currentWordIndexRef.current
                  );
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-background border border-border text-[11px] font-semibold text-foreground hover:border-[#B85D3B]"
            >
              İnerken cihaz sesiyle dinle
            </button>
          </div>

          <div className="h-2 w-full rounded-full bg-background overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#B85D3B] to-[#5C6B57] transition-all duration-200"
              style={{ width: `${Math.max(4, downloadPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Active Sentence & Page Auto-Scroll Synchronization Strip */}
      {(isPlaying || isSynthesizingFirst || statusMessage) && (
        <div className="px-3.5 py-2.5 rounded-xl bg-background/80 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#B85D3B] shrink-0" />
            <span className="truncate text-foreground font-serif">
              {isSynthesizingFirst
                ? "Ses hazırlanıyor…"
                : statusMessage ||
                  (currentSentence
                    ? `Cümle #${activeSentenceIdx + 1}/${sentences.length}: "${currentSentence.text}"`
                    : "Sesli okuma hazır")}
            </span>
          </div>
          <span className="text-[11px] text-[#5C6B57] font-semibold shrink-0 tabular-nums flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C6B57]" />
            <span>Sayfa sesi takip ediyor</span>
          </span>
        </div>
      )}
    </div>

    {/* Sabit kontrol çubuğu (mobil ve masaüstü): sayfa otomatik kaydığında ana çubuk
        görünümden çıkar; durdurma ve hız ayarı her zaman erişilebilir kalsın. Masaüstünde
        kenar çubuğunun sağındaki içerik alanında ortalanır. */}
    {hasStarted && (
      <div className="fixed inset-x-3 z-40 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6 md:left-[276px] md:right-0 lg:left-[292px] md:px-3 flex justify-center pointer-events-none">
      <div
        role="toolbar"
        aria-label="Sesli okuma kontrolleri"
        className="pointer-events-auto w-full md:max-w-xl p-2 rounded-2xl bg-surface/95 backdrop-blur-xl border border-border shadow-lg flex items-center gap-1.5"
      >
        <button
          type="button"
          onClick={() => {
            if (isPlaying || isSynthesizingFirst) {
              stopAudioPlayback(true);
            } else {
              startAudioPlayback();
            }
          }}
          aria-label={isPlaying || isSynthesizingFirst ? "Sesli okumayı duraklat" : "Sesli okumayı başlat"}
          className="w-11 h-11 rounded-xl bg-[#B85D3B] text-[#F6F1E7] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          {isPlaying || isSynthesizingFirst ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSkipSentence(-1)}
          aria-label="Önceki cümle"
          className="w-9 h-11 rounded-xl bg-background border border-border text-muted flex items-center justify-center shrink-0"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleSkipSentence(1)}
          aria-label="Sonraki cümle"
          className="w-9 h-11 rounded-xl bg-background border border-border text-muted flex items-center justify-center shrink-0"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
          <button
            type="button"
            onClick={() => handleAdjustWpm(wpm - 15)}
            aria-label="Hızı azalt"
            className="w-10 h-11 rounded-xl bg-background border border-border text-foreground flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="px-1 text-center tabular-nums leading-tight min-w-[64px]">
            <div className="text-sm font-bold text-[#B85D3B]">{wpm}</div>
            <div className="text-[10px] text-muted">
              WPM • {playbackRate.toFixed(2)}x
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleAdjustWpm(wpm + 15)}
            aria-label="Hızı artır"
            className="w-10 h-11 rounded-xl bg-background border border-border text-foreground flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>
    )}
    </>
  );
}
