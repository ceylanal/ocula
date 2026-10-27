import { describe, expect, it } from "vitest";
import { tokenizeParagraphs } from "./textUtils";
import {
  buildSentenceChunks,
  detectPreferredVoice,
  findSentenceIndexForWord,
  getWordIndexAtProgress,
  playbackRateToWpm,
  wpmToPlaybackRate,
} from "./piperAudioService";

const tokens = (text: string[]) => tokenizeParagraphs(text).words;

describe("WPM ⇄ playbackRate", () => {
  it("150 WPM 1.0x'tir ve sınırlara sıkıştırılır", () => {
    expect(wpmToPlaybackRate(150)).toBe(1);
    expect(wpmToPlaybackRate(300)).toBe(2);
    expect(wpmToPlaybackRate(10)).toBe(0.5);
    expect(wpmToPlaybackRate(9000)).toBe(3);
  });

  it("dönüşüm birbirinin tersidir", () => {
    for (const wpm of [90, 150, 225, 300, 450]) {
      expect(playbackRateToWpm(wpmToPlaybackRate(wpm))).toBe(wpm);
    }
  });
});

describe("detectPreferredVoice", () => {
  it("Türkçe harf veya sık Türkçe sözcük varsa Türkçe ses seçer", () => {
    expect(detectPreferredVoice("Dünya dönüyor")).toBe("tr_TR-dfki-medium");
    expect(detectPreferredVoice("kitap ve kalem")).toBe("tr_TR-dfki-medium");
  });

  it("aksi halde İngilizce ses seçer", () => {
    expect(detectPreferredVoice("The quick brown fox")).toBe("en_US-lessac-medium");
  });
});

describe("buildSentenceChunks", () => {
  it("boş girdide boş liste döndürür", () => {
    expect(buildSentenceChunks([])).toEqual([]);
  });

  it("cümle sonu noktalamasında böler ve indeksleri korur", () => {
    const chunks = buildSentenceChunks(tokens(["Bir iki. Üç dört beş! Altı"]));
    expect(chunks.map((c) => c.text)).toEqual(["Bir iki.", "Üç dört beş!", "Altı"]);
    expect(chunks.map((c) => [c.startWordIndex, c.endWordIndex])).toEqual([
      [0, 1],
      [2, 4],
      [5, 5],
    ]);
    expect(chunks.map((c) => c.sentenceIndex)).toEqual([0, 1, 2]);
  });

  it("paragraf sınırında noktalama olmasa da böler", () => {
    const chunks = buildSentenceChunks(tokens(["ilk paragraf", "ikinci paragraf"]));
    expect(chunks).toHaveLength(2);
  });

  it("24 kelimeyi aşan cümleyi parçalara ayırır", () => {
    const long = Array.from({ length: 50 }, (_, i) => `k${i}`).join(" ");
    const chunks = buildSentenceChunks(tokens([long]));
    expect(chunks).toHaveLength(3);
    expect(chunks[0].words).toHaveLength(24);
    expect(chunks.reduce((n, c) => n + c.words.length, 0)).toBe(50);
  });

  it("kelime oranları 0'dan 1'e kesintisiz ve artan şekilde dizilir", () => {
    const [chunk] = buildSentenceChunks(tokens(["kısa ve uzunuzunuzun kelimeler."]));
    expect(chunk.words[0].charStartRatio).toBe(0);
    expect(chunk.words[chunk.words.length - 1].charEndRatio).toBeCloseTo(1);
    for (let i = 1; i < chunk.words.length; i++) {
      expect(chunk.words[i].charStartRatio).toBeCloseTo(chunk.words[i - 1].charEndRatio);
    }
  });
});

describe("cümle ve kelime eşlemesi", () => {
  const chunks = buildSentenceChunks(tokens(["Bir iki üç. Dört beş altı."]));

  it("kelime indeksinden cümle bulur", () => {
    expect(findSentenceIndexForWord(chunks, 1)).toBe(0);
    expect(findSentenceIndexForWord(chunks, 4)).toBe(1);
    expect(findSentenceIndexForWord(chunks, 999)).toBe(0);
  });

  it("oynatma ilerlemesinden kelime bulur ve uçları sıkıştırır", () => {
    expect(getWordIndexAtProgress(chunks[0], 0)).toBe(0);
    expect(getWordIndexAtProgress(chunks[0], 1)).toBe(2);
    expect(getWordIndexAtProgress(chunks[0], 5)).toBe(2);
    expect(getWordIndexAtProgress(chunks[0], -1)).toBe(0);
  });
});
