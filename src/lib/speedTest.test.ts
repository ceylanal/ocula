import { describe, expect, it } from "vitest";
import {
  CALIBRATION_MIN_COMPREHENSION,
  MAX_PLAUSIBLE_WPM,
  READER_WPM_MAX,
  READER_WPM_MIN,
  effectiveWpm,
  evaluateReading,
  formatDuration,
  minimumValidSeconds,
  recommendedReaderWpm,
} from "./speedTest";

describe("evaluateReading (anti-cheat)", () => {
  it("1200 WPM üstünü geçersiz sayar", () => {
    // 275 kelimeyi 4 sn'de geçmek ≈ 4125 WPM
    const res = evaluateReading(275, 4000);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.wpm).toBeGreaterThan(MAX_PLAUSIBLE_WPM);
      expect(res.minSeconds).toBe(14);
    }
  });

  it("sınırın hemen altındaki okumayı kabul eder", () => {
    const wordCount = 275;
    const ms = Math.ceil(minimumValidSeconds(wordCount) * 1000) + 100;
    const res = evaluateReading(wordCount, ms);
    expect(res.valid).toBe(true);
  });

  it("tam sınırda (1200 WPM) kabul eder", () => {
    expect(evaluateReading(1200, 60_000)).toMatchObject({ valid: true, wpm: 1200 });
  });

  it("normal hızı doğru hesaplar", () => {
    expect(evaluateReading(300, 60_000)).toMatchObject({ valid: true, wpm: 300 });
    expect(evaluateReading(150, 30_000)).toMatchObject({ valid: true, wpm: 300 });
  });

  it("sıfır süreyi sonsuz hıza çevirmeden geçersiz sayar", () => {
    const res = evaluateReading(200, 0);
    expect(res.valid).toBe(false);
    expect(Number.isFinite(res.wpm)).toBe(true);
  });
});

describe("recommendedReaderWpm", () => {
  it("anlama eşiğin altındaysa öneri üretmez", () => {
    expect(recommendedReaderWpm(400, CALIBRATION_MIN_COMPREHENSION - 1)).toBeNull();
  });

  it("eşikte ve üstünde hızın %10 fazlasını önerir", () => {
    expect(recommendedReaderWpm(400, CALIBRATION_MIN_COMPREHENSION)).toBe(440);
    expect(recommendedReaderWpm(300, 100)).toBe(330);
  });

  it("Smart Reader aralığına sıkıştırır", () => {
    expect(recommendedReaderWpm(1200, 100)).toBe(READER_WPM_MAX);
    expect(recommendedReaderWpm(10, 100)).toBe(READER_WPM_MIN);
  });
});

describe("effectiveWpm", () => {
  it("hız × anlama oranını yuvarlar", () => {
    expect(effectiveWpm(300, 75)).toBe(225);
    expect(effectiveWpm(333, 50)).toBe(167);
    expect(effectiveWpm(300, 0)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("dakika yalnızca varsa gösterilir", () => {
    expect(formatDuration(5_300)).toBe("5.3 sn");
    expect(formatDuration(65_900)).toBe("1 dk 5.9 sn");
  });
});
