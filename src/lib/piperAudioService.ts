"use client";

import { TokenizedWord } from "./textUtils";

export type PiperVoiceId =
  | "tr_TR-dfki-medium"
  | "tr_TR-fahrettin-medium"
  | "en_US-lessac-medium";

export interface PiperVoiceOption {
  id: PiperVoiceId;
  label: string;
  lang: "tr-TR" | "en-US";
  sizeMb: number;
}

export const PIPER_VOICES: PiperVoiceOption[] = [
  {
    id: "tr_TR-dfki-medium",
    label: "Türkçe Nöral (DFKI • Doğal)",
    lang: "tr-TR",
    sizeMb: 61,
  },
  {
    id: "tr_TR-fahrettin-medium",
    label: "Türkçe Nöral (Fahrettin • Tok)",
    lang: "tr-TR",
    sizeMb: 61,
  },
  {
    id: "en_US-lessac-medium",
    label: "English Neural (Lessac • Clear)",
    lang: "en-US",
    sizeMb: 61,
  },
];

export interface SentenceWordSpan {
  word: string;
  globalIndex: number;
  charStartRatio: number;
  charEndRatio: number;
}

export interface SentenceChunk {
  sentenceIndex: number;
  text: string;
  startWordIndex: number;
  endWordIndex: number;
  words: SentenceWordSpan[];
}

export interface ModelDownloadProgress {
  voiceId: PiperVoiceId;
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Converts Ocula WPM (100 - 1000) to HTML5 <audio> playbackRate (0.5x - 3.0x)
 * Formula specified: Math.min(Math.max(wpm / 150, 0.5), 3.0)
 */
export function wpmToPlaybackRate(wpm: number): number {
  return Number(Math.min(Math.max(wpm / 150, 0.5), 3.0).toFixed(2));
}

/**
 * Automatically detects whether text is primarily Turkish or English
 * and returns the appropriate default Piper neural voice.
 */
export function detectPreferredVoice(textSample: string): PiperVoiceId {
  if (/[çğıöşüÇĞİÖŞÜ]/.test(textSample)) {
    return "tr_TR-dfki-medium";
  }
  const turkishCommon =
    /\b(ve|bir|bu|için|ile|olarak|daha|çok|gibi|veya|olan|kadar)\b/i;
  if (turkishCommon.test(textSample)) {
    return "tr_TR-dfki-medium";
  }
  return "en_US-lessac-medium";
}

/**
 * Splits tokenized book words into natural sentences starting from initialWordIndex
 * (or splits the entire book so the user can jump to any word/sentence).
 * Calculates cumulative character-length ratios for each word so <audio> currentTime
 * maps accurately to the active word in Pacer / Smart Reader.
 */
export function buildSentenceChunks(words: TokenizedWord[]): SentenceChunk[] {
  if (words.length === 0) return [];

  const sentences: SentenceChunk[] = [];
  let currentWords: TokenizedWord[] = [];

  const flushSentence = () => {
    if (currentWords.length === 0) return;

    // Compute character length proportions for each word in the sentence
    const lengths = currentWords.map((w) => Math.max(1, w.word.length + 1));
    const totalChars = Math.max(
      1,
      lengths.reduce((acc, l) => acc + l, 0)
    );

    let cumulative = 0;
    const spans: SentenceWordSpan[] = currentWords.map((w, idx) => {
      const startRatio = cumulative / totalChars;
      cumulative += lengths[idx];
      const endRatio = cumulative / totalChars;
      return {
        word: w.word,
        globalIndex: w.globalIndex,
        charStartRatio: startRatio,
        charEndRatio: endRatio,
      };
    });

    sentences.push({
      sentenceIndex: sentences.length,
      text: currentWords.map((w) => w.word).join(" "),
      startWordIndex: currentWords[0].globalIndex,
      endWordIndex: currentWords[currentWords.length - 1].globalIndex,
      words: spans,
    });

    currentWords = [];
  };

  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    currentWords.push(token);

    const endsSentence = /[.!?…:;]+["”’)]*$/.test(token.word);
    const nextToken = words[i + 1];
    const paragraphChanged =
      nextToken && nextToken.paragraphIndex !== token.paragraphIndex;

    // Flush at sentence punctuation, paragraph break, or max 24 words per chunk for fast first-audio synthesis
    if (endsSentence || paragraphChanged || currentWords.length >= 24) {
      flushSentence();
    }
  }

  flushSentence();
  return sentences;
}

/**
 * Finds the sentence index containing a given globalWordIndex.
 */
export function findSentenceIndexForWord(
  sentences: SentenceChunk[],
  wordIndex: number
): number {
  if (sentences.length === 0) return 0;
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (wordIndex >= s.startWordIndex && wordIndex <= s.endWordIndex) {
      return i;
    }
  }
  return 0;
}

/**
 * Given playback progress (0.0 to 1.0) within a SentenceChunk,
 * returns the exact globalWordIndex corresponding to the character-length ratio.
 */
export function getWordIndexAtProgress(
  sentence: SentenceChunk,
  progressRatio: number
): number {
  if (!sentence || sentence.words.length === 0) return 0;
  const clamped = Math.max(0, Math.min(0.9999, progressRatio));
  for (const span of sentence.words) {
    if (clamped >= span.charStartRatio && clamped <= span.charEndRatio) {
      return span.globalIndex;
    }
  }
  return sentence.words[sentence.words.length - 1].globalIndex;
}

/**
 * Checks whether the current browser environment supports WebAssembly & OPFS/Workers
 * required for Piper Neural TTS.
 */
export function isPiperWasmSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function" &&
    typeof Worker !== "undefined"
  );
}

/**
 * Checks if a voice model is already cached in OPFS or CacheStorage.
 */
export async function isVoiceModelCached(
  voiceId: PiperVoiceId
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const fileName = `${voiceId}.onnx`;

  try {
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("piper", { create: false });
      const fh = await dir.getFileHandle(fileName, { create: false });
      const file = await fh.getFile();
      if (file && file.size > 1_000_000) return true;
    }
  } catch {
    // Not in OPFS
  }

  try {
    if (typeof caches !== "undefined") {
      const cache = await caches.open("ocula-piper-models-v1");
      const keys = await cache.keys();
      if (keys.some((req) => req.url.endsWith(fileName))) {
        return true;
      }
    }
  } catch {
    // Ignore
  }

  return false;
}

interface PendingWorkerRequest {
  resolve: (val: { blobUrl: string; durationSeconds: number }) => void;
  reject: (err: Error) => void;
  onProgress?: (prog: ModelDownloadProgress) => void;
}

/**
 * Singleton Piper Neural TTS Worker Manager
 * Manages the Web Worker, model download progress callbacks, and in-memory WAV Blob prefetch cache.
 */
class PiperAudioEngineManager {
  private worker: Worker | null = null;
  private requestCounter = 0;
  private pending = new Map<number, PendingWorkerRequest>();
  private globalProgressListeners = new Set<
    (prog: ModelDownloadProgress) => void
  >();
  private modelReadyListeners = new Set<(voiceId: PiperVoiceId) => void>();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    if (!isPiperWasmSupported()) {
      throw new Error("Tarayıcı WebAssembly desteklemiyor.");
    }

    const worker = new Worker("/piper/piper-worker.mjs", { type: "module" });

    worker.onmessage = (event) => {
      const data = event.data || {};
      const { type, requestId } = data;

      if (type === "DOWNLOAD_PROGRESS") {
        const prog: ModelDownloadProgress = {
          voiceId: data.voiceId,
          loaded: data.loaded,
          total: data.total,
          percent: data.percent,
        };
        const req = this.pending.get(requestId);
        req?.onProgress?.(prog);
        this.globalProgressListeners.forEach((cb) => cb(prog));
        return;
      }

      if (type === "MODEL_CACHED_READY" || type === "MODEL_READY") {
        this.modelReadyListeners.forEach((cb) => cb(data.voiceId));
        return;
      }

      if (type === "SYNTHESIS_RESULT") {
        const req = this.pending.get(requestId);
        if (req) {
          this.pending.delete(requestId);
          const blob = new Blob([data.wavArrayBuffer], { type: "audio/wav" });
          const blobUrl = URL.createObjectURL(blob);
          req.resolve({
            blobUrl,
            durationSeconds: data.durationSeconds || 1,
          });
        }
        return;
      }

      if (type === "ERROR") {
        const req = this.pending.get(requestId);
        if (req) {
          this.pending.delete(requestId);
          req.reject(new Error(data.message || "Piper TTS sentezleme hatası"));
        }
      }
    };

    worker.onerror = (err) => {
      console.error("Piper Worker hatası:", err);
      this.pending.forEach((req) =>
        req.reject(new Error("Piper Web Worker çalışmayı durdurdu."))
      );
      this.pending.clear();
    };

    this.worker = worker;
    return worker;
  }

  public onDownloadProgress(
    cb: (prog: ModelDownloadProgress) => void
  ): () => void {
    this.globalProgressListeners.add(cb);
    return () => {
      this.globalProgressListeners.delete(cb);
    };
  }

  public onModelReady(cb: (voiceId: PiperVoiceId) => void): () => void {
    this.modelReadyListeners.add(cb);
    return () => {
      this.modelReadyListeners.delete(cb);
    };
  }

  /**
   * Synthesizes a single sentence off the main thread in the Piper Web Worker
   * and returns a ready-to-play HTML5 <audio> .wav Blob URL.
   */
  public synthesizeSentenceToWav(
    text: string,
    voiceId: PiperVoiceId,
    onProgress?: (prog: ModelDownloadProgress) => void
  ): Promise<{ blobUrl: string; durationSeconds: number }> {
    return new Promise((resolve, reject) => {
      let worker: Worker;
      try {
        worker = this.ensureWorker();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      const requestId = ++this.requestCounter;
      this.pending.set(requestId, { resolve, reject, onProgress });

      worker.postMessage({
        type: "SYNTHESIZE",
        requestId,
        text,
        voiceId,
      });
    });
  }
}

export const piperEngine = new PiperAudioEngineManager();

/**
 * Fallback Web Speech API (window.speechSynthesis) helper
 * Used automatically if WebAssembly is unsupported or while the user chooses instant fallback.
 */
export function speakWithBrowserFallback(options: {
  sentence: SentenceChunk;
  wpm: number;
  lang: "tr-TR" | "en-US";
  onWordChange: (wordIndex: number) => void;
  onEnd: () => void;
  onError: () => void;
}): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onError();
    return () => {};
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(options.sentence.text);
  utterance.lang = options.lang;
  // Web Speech API rate is 0.5 - 3.0
  utterance.rate = wpmToPlaybackRate(options.wpm);

  const voices = window.speechSynthesis.getVoices();
  const matchingVoice = voices.find((v) =>
    v.lang.toLowerCase().startsWith(options.lang.slice(0, 2).toLowerCase())
  );
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  let cancelled = false;
  const totalChars = Math.max(1, options.sentence.text.length);

  // Estimate duration from WPM so even browsers without boundary events still advance Pacer smoothly
  const wordCount = Math.max(1, options.sentence.words.length);
  const estimatedDurationMs = Math.max(
    600,
    Math.round((wordCount / Math.max(100, options.wpm)) * 60000)
  );
  const startTime = Date.now();

  const timer = setInterval(() => {
    if (cancelled) return;
    const elapsed = Date.now() - startTime;
    const ratio = Math.min(0.99, elapsed / estimatedDurationMs);
    const activeWordIdx = getWordIndexAtProgress(options.sentence, ratio);
    options.onWordChange(activeWordIdx);
  }, 60);

  utterance.onboundary = (event) => {
    if (cancelled) return;
    if (typeof event.charIndex === "number") {
      const ratio = Math.min(0.99, event.charIndex / totalChars);
      const activeWordIdx = getWordIndexAtProgress(options.sentence, ratio);
      options.onWordChange(activeWordIdx);
    }
  };

  utterance.onend = () => {
    clearInterval(timer);
    if (!cancelled) {
      options.onEnd();
    }
  };

  utterance.onerror = () => {
    clearInterval(timer);
    if (!cancelled) {
      options.onError();
    }
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    cancelled = true;
    clearInterval(timer);
    window.speechSynthesis.cancel();
  };
}
