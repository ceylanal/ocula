import { describe, expect, it } from "vitest";
import { generateAlgorithmicDailyPlan } from "./dailyPlanner";

describe("generateAlgorithmicDailyPlan", () => {
  it("anlama %75'in altındaysa hız baskısını azaltır", () => {
    const plan = generateAlgorithmicDailyPlan(300, 60);
    expect(plan.protocolName).toMatch(/Kavrama/);
    expect(plan.recommendedPacerWpm).toBe(315);
    expect(plan.recommendedRsvpWpm).toBe(330);
  });

  it("yeterli anlamada ve 330 WPM altında aşırı hız protokolünü seçer", () => {
    const plan = generateAlgorithmicDailyPlan(250, 85);
    expect(plan.protocolName).toMatch(/Overspeed/);
    expect(plan.recommendedRsvpWpm).toBe(338);
    expect(plan.recommendedPacerWpm).toBe(300);
  });

  it("330 WPM ve üstünde elit protokole geçer", () => {
    const plan = generateAlgorithmicDailyPlan(450, 90);
    expect(plan.protocolName).toMatch(/Elit/);
    expect(plan.recommendedChunkSize).toBe(3);
  });

  it("öneriler üst sınırları aşmaz", () => {
    const plan = generateAlgorithmicDailyPlan(320, 95);
    expect(plan.recommendedRsvpWpm).toBeLessThanOrEqual(700);
    expect(plan.recommendedPacerWpm).toBeLessThanOrEqual(600);
  });

  it("geçersiz girdilerde güvenli varsayılanlara döner", () => {
    const plan = generateAlgorithmicDailyPlan(0, 0);
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.recommendedPacerWpm).toBeGreaterThan(0);
  });

  it("her görev kimlikli, tamamlanmamış ve bir hedef sayfaya bağlıdır", () => {
    for (const [wpm, comp] of [[200, 50], [250, 85], [500, 90]] as const) {
      const plan = generateAlgorithmicDailyPlan(wpm, comp);
      expect(plan.totalMinutes).toBe(15);
      expect(new Set(plan.tasks.map((t) => t.id)).size).toBe(plan.tasks.length);
      for (const task of plan.tasks) {
        expect(task.completed).toBe(false);
        expect(task.target_href.startsWith("/")).toBe(true);
      }
    }
  });
});
