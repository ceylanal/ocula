import { describe, expect, it } from "vitest";
import {
  countWordsInParagraphs,
  getORPParts,
  getPunctuationDelayMultiplier,
  tokenizeParagraphs,
} from "./textUtils";

describe("getORPParts", () => {
  it("boş metin için boş parçalar döndürür", () => {
    expect(getORPParts("   ")).toEqual({ prefix: "", orpChar: "", suffix: "" });
  });

  it("parçaların birleşimi orijinal kelimeyi verir", () => {
    for (const word of ["a", "ev", "okuma", "Türkçe", "dolaşım", "hızlı-okuma"]) {
      const { prefix, orpChar, suffix } = getORPParts(word);
      expect(prefix + orpChar + suffix).toBe(word);
      expect(orpChar).toHaveLength(1);
    }
  });

  it("odak harfi noktalama değil harf olur", () => {
    const { orpChar } = getORPParts("(ş)");
    expect(orpChar).toBe("ş");
  });

  it("kısa kelimelerde ikinci harfi seçer", () => {
    expect(getORPParts("ev").orpChar).toBe("v");
  });
});

describe("tokenizeParagraphs", () => {
  it("küresel ve paragraf içi indeksleri doğru atar", () => {
    const { words, paragraphsOfWords } = tokenizeParagraphs([
      "bir iki üç",
      "dört beş",
    ]);
    expect(words.map((w) => w.word)).toEqual(["bir", "iki", "üç", "dört", "beş"]);
    expect(words.map((w) => w.globalIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(words[3]).toMatchObject({ paragraphIndex: 1, wordIndexInParagraph: 0 });
    expect(paragraphsOfWords).toHaveLength(2);
  });

  it("boş paragrafları ve fazla boşlukları atlar", () => {
    const { words, paragraphsOfWords } = tokenizeParagraphs(["  a   b  ", "", "   ", "c"]);
    expect(words.map((w) => w.word)).toEqual(["a", "b", "c"]);
    expect(paragraphsOfWords).toHaveLength(2);
    expect(words[2].paragraphIndex).toBe(3);
  });
});

describe("getPunctuationDelayMultiplier", () => {
  it("cümle sonunda en uzun duraklamayı verir", () => {
    expect(getPunctuationDelayMultiplier("bitti.")).toBe(1.65);
    expect(getPunctuationDelayMultiplier("neden?")).toBe(1.65);
  });

  it("virgül ve tirede orta duraklama verir", () => {
    expect(getPunctuationDelayMultiplier("ama,")).toBe(1.3);
  });

  it("uzun kelimede hafif, kısa kelimede hiç duraklama eklemez", () => {
    expect(getPunctuationDelayMultiplier("disiplinlerarası")).toBe(1.15);
    expect(getPunctuationDelayMultiplier("ev")).toBe(1.0);
  });
});

describe("countWordsInParagraphs", () => {
  it("tokenizeParagraphs ile aynı sayıyı verir", () => {
    const paragraphs = ["Bir  iki\nüç", " dört ", ""];
    expect(countWordsInParagraphs(paragraphs)).toBe(
      tokenizeParagraphs(paragraphs).words.length
    );
    expect(countWordsInParagraphs(paragraphs)).toBe(4);
  });
});
