import { describe, expect, it } from "vitest";
import { SPEED_TEST_ARTICLES } from "./mockData";
import { MAX_PLAUSIBLE_WPM } from "@/lib/speedTest";
import { countWordsInParagraphs } from "@/lib/textUtils";

describe("kalibrasyon metin havuzu", () => {
  it("kimlikler benzersizdir", () => {
    const ids = SPEED_TEST_ARTICLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("her zorluk seviyesinde en az üç metin vardır", () => {
    for (const level of ["Başlangıç", "Orta", "İleri"] as const) {
      expect(SPEED_TEST_ARTICLES.filter((a) => a.difficulty === level).length).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(SPEED_TEST_ARTICLES.map((a) => [a.id, a] as const))(
    "%s: kelime sayısı ve soru yapısı tutarlı",
    (_id, article) => {
      expect(article.word_count).toBe(countWordsInParagraphs(article.paragraphs));
      // Anti-cheat asgari süresi okunabilir bir değer olmalı (en az birkaç saniye)
      expect((article.word_count / MAX_PLAUSIBLE_WPM) * 60).toBeGreaterThan(5);
      expect(article.questions).toHaveLength(4);

      const qIds = new Set<string>();
      for (const q of article.questions) {
        expect(q.book_id).toBe(article.id);
        expect(qIds.has(q.id)).toBe(false);
        qIds.add(q.id);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(Number.isInteger(q.correct_option)).toBe(true);
        expect(q.correct_option).toBeGreaterThanOrEqual(0);
        expect(q.correct_option).toBeLessThan(4);
      }
    }
  );

  it("doğru şık konumu tek bir şıkta yığılmaz", () => {
    const counts = [0, 0, 0, 0];
    for (const a of SPEED_TEST_ARTICLES) for (const q of a.questions) counts[q.correct_option]++;
    const total = counts.reduce((n, c) => n + c, 0);
    for (const c of counts) expect(c / total).toBeLessThan(0.5);
  });
});
