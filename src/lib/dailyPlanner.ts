import { DailyTask } from "@/types";

export interface AlgorithmicPlanMetadata {
  protocolName: string;
  protocolBadge: string;
  focusGoal: string;
  recommendedRsvpWpm: number;
  recommendedPacerWpm: number;
  recommendedChunkSize: 1 | 2 | 3;
  totalMinutes: number;
  tasks: DailyTask[];
}

/**
 * Phase 3: Algorithmic Daily Planner
 * Generates a personalized 15-minute daily training routine based on the user's
 * current WPM and comprehension rate (%).
 */
export function generateAlgorithmicDailyPlan(
  currentWpm: number,
  comprehensionRate: number
): AlgorithmicPlanMetadata {
  const safeWpm = Math.max(120, currentWpm || 250);
  const safeComp = Math.max(40, comprehensionRate || 75);

  // Case 1: Comprehension is below 75% -> Prioritize comprehension & regression control
  if (safeComp < 75) {
    const pacerWpm = Math.round(safeWpm * 1.05);
    const rsvpWpm = Math.round(safeWpm * 1.1);

    return {
      protocolName: "Kavrama & Regresyon Kontrol Protokolü",
      protocolBadge: "Anlama Odaklı Kalibrasyon",
      focusGoal: `Anlama oranınız (%${safeComp}) %75 eşiğinin altında olduğu için hız baskısını azaltıp anlam blokları ve geriye dönüş (regresyon) kontrolüne odaklanıyoruz.`,
      recommendedRsvpWpm: rsvpWpm,
      recommendedPacerWpm: pacerWpm,
      recommendedChunkSize: 2,
      totalMinutes: 15,
      tasks: [
        {
          id: "alg-task-1",
          title: "1x Schulte 5x5 Görsel Odak Isınması",
          subtitle: "Hatasız (<2 hata) merkez odak koruma antrenmanı",
          exercise_type: "schulte",
          target_href: "/drills?tab=schulte",
          duration_label: "3 dk",
          completed: false,
        },
        {
          id: "alg-task-2",
          title: `Magic Pacer Blok Okuma (${pacerWpm} WPM)`,
          subtitle:
            "3'lü kelime bloğu ile cümle bütünlüğünü koruyarak satır takibi",
          exercise_type: "pacer",
          target_href: `/drills?tab=pacer&wpm=${pacerWpm}`,
          duration_label: "4 dk",
          completed: false,
        },
        {
          id: "alg-task-3",
          title: `RSVP 2'li Grup Kavramsal Akış (${rsvpWpm} WPM)`,
          subtitle: "Akıllı noktalama duraksaması açık modda anlam yakalama",
          exercise_type: "rsvp",
          target_href: `/drills?tab=rsvp&wpm=${rsvpWpm}`,
          duration_label: "3 dk",
          completed: false,
        },
        {
          id: "alg-task-4",
          title: "Smart Reader Okuma + AI Anlama Testi",
          subtitle:
            "Kütüphaneden bir eseri okuyup bölüm sonu yapay zeka sorularını çöz",
          exercise_type: "book_reading",
          target_href: "/library",
          duration_label: "5 dk",
          completed: false,
        },
      ],
    };
  }

  // Case 2: Low-to-Medium WPM (< 330 WPM) with Solid Comprehension (>= 75%) -> Break Subvocalization
  if (safeWpm < 330) {
    const rsvpOverspeed = Math.min(700, Math.round(safeWpm * 1.35));
    const pacerTarget = Math.min(600, Math.round(safeWpm * 1.2));

    return {
      protocolName: "İç Seslendirme Kırma (Overspeed) Protokolü",
      protocolBadge: "Hız Sıçraması • Faz 3",
      focusGoal: `Anlama oranınız (%${safeComp}) güçlü! Konuşma hızı darboğazını (${safeWpm} WPM) aşmak için %35 aşırı hız (overspeed) antrenmanı uyguluyoruz.`,
      recommendedRsvpWpm: rsvpOverspeed,
      recommendedPacerWpm: pacerTarget,
      recommendedChunkSize: 2,
      totalMinutes: 15,
      tasks: [
        {
          id: "alg-task-1",
          title: "Schulte 5x5 & Çevresel Görüş Flaşlama",
          subtitle: "Retina parafoveal algı açısını genişletme ısınması",
          exercise_type: "schulte",
          target_href: "/drills?tab=schulte",
          duration_label: "3 dk",
          completed: false,
        },
        {
          id: "alg-task-2",
          title: `RSVP Overspeed Sprint (${rsvpOverspeed} WPM)`,
          subtitle:
            "Normal hızınızın %35 üzerinde akışla iç seslendirmeyi devre dışı bırakın",
          exercise_type: "rsvp",
          target_href: `/drills?tab=rsvp&wpm=${rsvpOverspeed}`,
          duration_label: "4 dk",
          completed: false,
        },
        {
          id: "alg-task-3",
          title: `Magic Pacer Ritm Sabitleme (${pacerTarget} WPM)`,
          subtitle: "Bulanık maskeleme ile gözü yeni yüksek tempoya adapte edin",
          exercise_type: "pacer",
          target_href: `/drills?tab=pacer&wpm=${pacerTarget}`,
          duration_label: "4 dk",
          completed: false,
        },
        {
          id: "alg-task-4",
          title: "Smart Reader PDF / EPUB Kitap Pratiği",
          subtitle: `Kütüphanedeki kitabınızı ${pacerTarget} WPM Pacer modunda okuyun`,
          exercise_type: "book_reading",
          target_href: "/library",
          duration_label: "4 dk",
          completed: false,
        },
      ],
    };
  }

  // Case 3: High WPM (>= 330 WPM) & Strong Comprehension (>= 75%) -> Elite Parafoveal & Multi-Word Chunking
  const eliteRsvpWpm = Math.min(950, Math.round(safeWpm * 1.35));
  const elitePacerWpm = Math.min(850, Math.round(safeWpm * 1.22));

  return {
    protocolName: "Elit Görsel Atlet & Parafoveal Blok Protokolü",
    protocolBadge: "İleri Seviye • 3'lü Kelime Grubu",
    focusGoal: `${safeWpm} WPM hız ve %${safeComp} anlama ile ileri seviyedesiniz. Tek fiksasyonda 3'lü kelime gruplarını fotoğraflayarak ${eliteRsvpWpm} WPM bandına çıkıyoruz.`,
    recommendedRsvpWpm: eliteRsvpWpm,
    recommendedPacerWpm: elitePacerWpm,
    recommendedChunkSize: 3,
    totalMinutes: 15,
    tasks: [
      {
        id: "alg-task-1",
        title: "Dinamik Karıştırmalı Schulte 5x5 (<20 sn)",
        subtitle: "Her tıklamada yeniden dizilen ızgara ile elit refleks",
        exercise_type: "schulte",
        target_href: "/drills?tab=schulte",
        duration_label: "3 dk",
        completed: false,
      },
      {
        id: "alg-task-2",
        title: `RSVP 3'lü Kelime Grubu Hiper-Akış (${eliteRsvpWpm} WPM)`,
        subtitle: "Tek bakışta 3 kelimeyi kavramsal blok olarak yakalayın",
        exercise_type: "rsvp",
        target_href: `/drills?tab=rsvp&wpm=${eliteRsvpWpm}`,
        duration_label: "4 dk",
        completed: false,
      },
      {
        id: "alg-task-3",
        title: `Magic Pacer Tam Blok Maskeleme (${elitePacerWpm} WPM)`,
        subtitle: "5 kelimelik geniş odak penceresiyle yüksek hızlı tarama",
        exercise_type: "pacer",
        target_href: `/drills?tab=pacer&wpm=${elitePacerWpm}`,
        duration_label: "4 dk",
        completed: false,
      },
      {
        id: "alg-task-4",
        title: "PDF / EPUB Kitap Okuma & AI Soru Sentezi",
        subtitle:
          "Kendi yüklediğiniz kitapta hızlı okuma ve AI anlama doğrulaması",
        exercise_type: "book_reading",
        target_href: "/library",
        duration_label: "4 dk",
        completed: false,
      },
    ],
  };
}
