import { SpeedTestArticle } from "@/types";

/** Fizyolojik olarak anlamlı okuma yapılabilecek üst sınır (kelime/dakika). */
export const MAX_PLAUSIBLE_WPM = 1200;

/** Anlama oranı bu eşiğin altındaysa hız artışı önerilmez. */
export const CALIBRATION_MIN_COMPREHENSION = 75;

/** Önerilen Smart Reader hızı, ulaşılan hızın bu katıdır. */
export const CALIBRATION_BOOST = 1.1;

/** Smart Reader / Pacer hız aralığı (kelime/dakika). */
export const READER_WPM_MIN = 100;
export const READER_WPM_MAX = 1000;

export type ReadingEvaluation =
  | { valid: true; wpm: number; seconds: number }
  | { valid: false; wpm: number; seconds: number; minSeconds: number };

/** Metni geçersiz saymadan okuyabilmek için gereken asgari süre (sn). */
export function minimumValidSeconds(wordCount: number): number {
  return (wordCount / MAX_PLAUSIBLE_WPM) * 60;
}

export function evaluateReading(
  wordCount: number,
  elapsedMs: number
): ReadingEvaluation {
  const seconds = Math.max(0.001, elapsedMs / 1000);
  const wpm = Math.round((wordCount / seconds) * 60);
  if (wpm > MAX_PLAUSIBLE_WPM) {
    return {
      valid: false,
      wpm,
      seconds,
      minSeconds: Math.ceil(minimumValidSeconds(wordCount)),
    };
  }
  return { valid: true, wpm, seconds };
}

export function effectiveWpm(wpm: number, comprehensionPct: number): number {
  return Math.round(wpm * (comprehensionPct / 100));
}

/** Anlama yeterliyse önerilecek Smart Reader hızı; değilse null. */
export function recommendedReaderWpm(
  wpm: number,
  comprehensionPct: number
): number | null {
  if (comprehensionPct < CALIBRATION_MIN_COMPREHENSION) return null;
  return Math.min(
    READER_WPM_MAX,
    Math.max(READER_WPM_MIN, Math.round(wpm * CALIBRATION_BOOST))
  );
}

export const DIFFICULTY_LABELS: Record<
  SpeedTestArticle["difficulty"],
  { label: string; description: string }
> = {
  Başlangıç: { label: "Kolay", description: "Akıcı, edebi anlatım" },
  Orta: { label: "Orta", description: "Popüler bilim" },
  İleri: { label: "Zor", description: "Akademik ve felsefi" },
};

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${mins > 0 ? `${mins} dk ` : ""}${secs}.${tenths} sn`;
}
