"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Play,
  CheckCircle2,
  Timer,
  FileText,
  Brain,
  Zap,
  Award,
  RotateCcw,
  ArrowRight,
  XCircle,
  TrendingUp,
  Eye,
  EyeOff,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { SPEED_TEST_ARTICLES } from "@/data/mockData";
import { useOkurLabStore } from "@/store/useOkurLabStore";
import {
  CALIBRATION_MIN_COMPREHENSION,
  DIFFICULTY_LABELS,
  MAX_PLAUSIBLE_WPM,
  ReadingEvaluation,
  effectiveWpm,
  evaluateReading,
  formatDuration,
  recommendedReaderWpm,
} from "@/lib/speedTest";
import { SpeedTestArticle } from "@/types";

type TestPhase = "intro" | "reading" | "quiz" | "result";
type DifficultyFilter = "all" | SpeedTestArticle["difficulty"];
type InvalidReading = Extract<ReadingEvaluation, { valid: false }>;

const FILTERS: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "Başlangıç", label: DIFFICULTY_LABELS["Başlangıç"].label },
  { value: "Orta", label: DIFFICULTY_LABELS["Orta"].label },
  { value: "İleri", label: DIFFICULTY_LABELS["İleri"].label },
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--bg-surface)",
  borderColor: "var(--border-color)",
  borderRadius: "12px",
  fontSize: "12px",
};

export default function SpeedTestPage() {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    SPEED_TEST_ARTICLES[0].id
  );
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [mounted, setMounted] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [calculatedWpm, setCalculatedWpm] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comprehensionScore, setComprehensionScore] = useState<number>(0);
  const [invalidReading, setInvalidReading] = useState<InvalidReading | null>(
    null
  );
  const [appliedWpm, setAppliedWpm] = useState<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const {
    recordExercise,
    addCalibrationRecord,
    applyCalibratedWpm,
    user,
    exerciseLogs,
    calibrationHistory,
    readerPrefs,
  } = useOkurLabStore();

  useEffect(() => setMounted(true), []);

  const chartData = exerciseLogs.slice(-10).map((log, i) => ({
    name: log.label || `#${i + 1}`,
    wpm: log.achieved_wpm,
    anlama: log.accuracy_score,
    etkiliWpm: effectiveWpm(log.achieved_wpm, log.accuracy_score),
  }));

  const article =
    SPEED_TEST_ARTICLES.find((a) => a.id === selectedArticleId) ||
    SPEED_TEST_ARTICLES[0];

  const visibleArticles = SPEED_TEST_ARTICLES.filter(
    (a) => difficultyFilter === "all" || a.difficulty === difficultyFilter
  );

  const completedIds = new Set(
    mounted ? calibrationHistory.map((r) => r.article_id) : []
  );

  // Başlangıç zamanı her okuma aşamasında bir kez alınır; sayaç yalnızca görünürse güncellenir.
  useEffect(() => {
    if (phase === "reading") {
      startTimeRef.current = Date.now();
      setElapsedMs(0);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "reading" || !showTimer) return;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [phase, showTimer]);

  const handleSelectFilter = (value: DifficultyFilter) => {
    setDifficultyFilter(value);
    const stillVisible =
      value === "all" || article.difficulty === value;
    if (!stillVisible) {
      const first = SPEED_TEST_ARTICLES.find((a) => a.difficulty === value);
      if (first) setSelectedArticleId(first.id);
    }
  };

  const handleStartReading = () => {
    setAnswers({});
    setInvalidReading(null);
    setAppliedWpm(null);
    setPhase("reading");
  };

  const handleFinishReading = () => {
    const finalMs = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : elapsedMs;
    const evaluation = evaluateReading(article.word_count, finalMs);

    if (!evaluation.valid) {
      setInvalidReading(evaluation);
      setPhase("intro");
      return;
    }

    setElapsedMs(finalMs);
    setCalculatedWpm(evaluation.wpm);
    setPhase("quiz");
  };

  const handleSubmitQuiz = () => {
    const questions = article.questions;
    const correctCount = questions.filter(
      (q) => answers[q.id] === q.correct_option
    ).length;
    const accuracyPct = Math.round((correctCount / questions.length) * 100);
    const durationSeconds = Math.max(1, Math.round(elapsedMs / 1000));

    setComprehensionScore(accuracyPct);
    setPhase("result");

    recordExercise({
      exercise_type: "speed_test",
      achieved_wpm: calculatedWpm,
      accuracy_score: accuracyPct,
      duration_seconds: durationSeconds,
    });
    addCalibrationRecord({
      article_id: article.id,
      article_title: article.title,
      difficulty: article.difficulty,
      wpm: calculatedWpm,
      comprehension: accuracyPct,
      effective_wpm: effectiveWpm(calculatedWpm, accuracyPct),
      duration_seconds: durationSeconds,
    });
  };

  const handleApplyCalibration = (wpm: number) => {
    applyCalibratedWpm(wpm);
    setAppliedWpm(wpm);
  };

  const handleRestart = () => {
    setInvalidReading(null);
    setAppliedWpm(null);
    setAnswers({});
    setPhase("intro");
  };

  const allQuestionsAnswered = article.questions.every(
    (q) => typeof answers[q.id] === "number"
  );

  const recommendedWpm = recommendedReaderWpm(
    calculatedWpm,
    comprehensionScore
  );

  const historyRows = mounted ? [...calibrationHistory].reverse() : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Kalibrasyon &amp; Analiz
          </h1>
          <p className="text-sm text-muted mt-1">
            Okuma hızını (WPM) ve anlama oranını (%) ölç, sonucu Smart Reader
            hızına uygula.
          </p>
        </div>

        {/* Phase Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`px-3 py-1 rounded-full border ${
              phase === "intro" || phase === "reading"
                ? "bg-terracotta text-white border-terracotta"
                : "bg-surface text-muted border-border"
            }`}
          >
            1. Hızlı Okuma
          </span>
          <span className="text-muted">→</span>
          <span
            className={`px-3 py-1 rounded-full border ${
              phase === "quiz"
                ? "bg-terracotta text-white border-terracotta"
                : "bg-surface text-muted border-border"
            }`}
          >
            2. Anlama Soruları (4)
          </span>
          <span className="text-muted">→</span>
          <span
            className={`px-3 py-1 rounded-full border ${
              phase === "result"
                ? "bg-sage text-white border-sage"
                : "bg-surface text-muted border-border"
            }`}
          >
            3. Analiz Raporu
          </span>
        </div>
      </div>

      {/* PHASE 1: INTRO & ARTICLE SELECTION */}
      {phase === "intro" && (
        <div className="space-y-6">
          {invalidReading && (
            <div
              role="alert"
              className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <div className="font-bold">Okuma süresi geçersiz sayıldı</div>
                <p className="text-muted leading-relaxed">
                  {article.word_count} kelimelik metin{" "}
                  {invalidReading.seconds.toFixed(1)} saniyede geçildi; bu,
                  yaklaşık {invalidReading.wpm} WPM eder ve fizyolojik sınır
                  olan {MAX_PLAUSIBLE_WPM} WPM&apos;nin üzerindedir. Bu metin
                  için en az {invalidReading.minSeconds} saniye gerekir. Sonuç
                  kaydedilmedi; metni baştan sona okuyarak testi tekrarla.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex p-1 rounded-xl bg-surface border border-border"
              role="tablist"
              aria-label="Zorluk seviyesi"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  role="tab"
                  aria-selected={difficultyFilter === f.value}
                  onClick={() => handleSelectFilter(f.value)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    difficultyFilter === f.value
                      ? "bg-terracotta text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted">
              {mounted ? completedIds.size : 0} / {SPEED_TEST_ARTICLES.length}{" "}
              metin tamamlandı
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleArticles.map((item) => {
              const isSelected = item.id === selectedArticleId;
              const isCompleted = completedIds.has(item.id);
              const level = DIFFICULTY_LABELS[item.difficulty];
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedArticleId(item.id)}
                  aria-pressed={isSelected}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 ${
                    isSelected
                      ? "bg-terracotta/10 border-terracotta shadow-lg shadow-terracotta/10"
                      : "bg-surface border-border hover:border-terracotta/40"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border font-semibold text-terracotta">
                        {item.category}
                      </span>
                      <span className="text-muted font-medium">
                        {level.label}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-base leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border/60">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {item.word_count} kelime
                    </span>
                    {isCompleted ? (
                      <span className="flex items-center gap-1 font-semibold text-sage">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Tamamlandı
                      </span>
                    ) : (
                      <span>{level.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-8 rounded-3xl bg-surface border-2 border-border text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-terracotta/15 border border-terracotta/30 flex items-center justify-center text-terracotta mx-auto">
              <Timer className="w-7 h-7" />
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-xl font-serif font-bold">{article.title}</h2>
              <p className="text-sm text-muted leading-relaxed">
                <strong>&quot;Testi Başlat&quot;</strong> düğmesine
                bastığında <strong>{article.word_count} kelimelik</strong> metin
                açılır ve süre arka planda ölçülmeye başlar. Süre, dikkatini
                dağıtmaması için varsayılan olarak gizlidir. Metni doğal
                hızında okuyup bitirdiğinde{" "}
                <strong>&quot;Okumayı Bitirdim&quot;</strong> düğmesine bas;
                ardından metne dönmeden 4 çoktan seçmeli soruyu yanıtla.
              </p>
            </div>

            <button
              onClick={handleStartReading}
              className="px-8 py-4 rounded-2xl bg-terracotta hover:bg-terracotta/90 text-white font-bold text-base inline-flex items-center gap-2.5 shadow-xl shadow-terracotta/25 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Testi Başlat</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: ACTIVE READING (TIMER HIDDEN BY DEFAULT) */}
      {phase === "reading" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-surface border-2 border-terracotta/40 overflow-hidden shadow-2xl"
        >
          <div className="sticky top-0 z-20 px-6 py-4 bg-surface-elevated/95 backdrop-blur border-b border-border flex items-center justify-between gap-4">
            <div>
              <span className="text-xs text-terracotta font-semibold uppercase tracking-wider">
                {article.category} • {article.word_count} Kelime
              </span>
              <h2 className="text-base sm:text-lg font-serif font-bold">
                {article.title}
              </h2>
            </div>

            <button
              onClick={() => setShowTimer((v) => !v)}
              aria-pressed={showTimer}
              className="px-4 py-2 rounded-xl bg-surface border border-border flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition-colors"
            >
              {showTimer ? (
                <>
                  <Timer className="w-4 h-4 text-sage" />
                  <span className="font-mono font-bold text-foreground">
                    {formatDuration(elapsedMs)}
                  </span>
                  <EyeOff className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Süreyi göster</span>
                </>
              )}
            </button>
          </div>

          <div className="p-6 sm:p-10 space-y-6 text-lg sm:text-xl leading-relaxed font-serif select-none">
            {article.paragraphs.map((p, idx) => (
              <p key={idx} className="text-foreground/95">
                {p}
              </p>
            ))}
          </div>

          <div className="p-6 bg-surface-elevated border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-muted">
              Metnin tamamını okuduysan süreyi durdurup anlama sorularına geç.
            </span>
            <button
              onClick={handleFinishReading}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-sage hover:bg-sage/90 text-white font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-sage/25 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Okumayı Bitirdim</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* PHASE 3: 4 MULTIPLE-CHOICE COMPREHENSION QUESTIONS */}
      {phase === "quiz" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-5 rounded-2xl bg-terracotta/10 border border-terracotta/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-terracotta" />
              <div>
                <div className="text-sm font-bold">
                  Okuma süren kaydedildi. Anlık hızın:{" "}
                  <span className="text-terracotta">{calculatedWpm} WPM</span>
                </div>
                <div className="text-xs text-muted">
                  Anlama oranını (%) hesaplamak için aşağıdaki 4 soruyu yanıtla.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {article.questions.map((q, qIdx) => (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-surface border border-border space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-terracotta/15 text-terracotta font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    S{qIdx + 1}
                  </span>
                  <h3 className="font-semibold text-base leading-snug">
                    {q.question_text}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pl-0 sm:pl-10">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[q.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                        }
                        className={`p-3.5 rounded-xl border text-left text-sm transition-all flex items-center gap-3 ${
                          isSelected
                            ? "bg-terracotta/15 border-terracotta text-foreground font-semibold"
                            : "bg-surface-elevated/60 border-border text-foreground/80 hover:border-terracotta/40"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full text-xs flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? "bg-terracotta border-terracotta text-white font-bold"
                              : "border-border text-muted"
                          }`}
                        >
                          {["A", "B", "C", "D"][optIdx]}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              disabled={!allQuestionsAnswered}
              onClick={handleSubmitQuiz}
              className={`px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-2 transition-all ${
                allQuestionsAnswered
                  ? "bg-terracotta hover:bg-terracotta/90 text-white shadow-xl shadow-terracotta/25"
                  : "bg-surface-elevated border border-border text-muted cursor-not-allowed"
              }`}
            >
              <Brain className="w-5 h-5" />
              <span>Sonuçları Hesapla</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* PHASE 4: RESULTS REPORT SCREEN */}
      {phase === "result" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="p-8 rounded-3xl bg-gradient-to-br from-terracotta/20 via-sage/10 to-surface border-2 border-terracotta/40 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-sage/20 border border-sage/40 flex items-center justify-center text-sage mx-auto">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-terracotta">
                Seviye Tespit Sonuç Raporu
              </div>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight">
                Okuma Hızın:{" "}
                <span className="text-terracotta">{calculatedWpm} WPM</span>{" "}
                <span className="text-muted font-light">|</span> Anlama Oranın:{" "}
                <span className="text-sage">%{comprehensionScore}</span>
              </h2>
              <p className="text-sm text-muted max-w-xl mx-auto">
                Net etkili okuma hızın (hız × anlama):{" "}
                <strong className="text-foreground">
                  {effectiveWpm(calculatedWpm, comprehensionScore)} WPM
                </strong>{" "}
                • Başlangıç hızın ({user.baseline_wpm} WPM) ile karşılaştırmalı
                sonuçlar aşağıdaki geçmiş tablosuna ve grafiklere kaydedildi.
              </p>
            </div>

            {/* Smart Reader calibration */}
            <div className="max-w-xl mx-auto p-5 rounded-2xl bg-surface border border-border text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sage">
                <Gauge className="w-4 h-4" />
                <span>Smart Reader Kalibrasyonu</span>
              </div>
              {recommendedWpm !== null ? (
                appliedWpm !== null ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-semibold text-sage">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Varsayılan okuma hızın {appliedWpm} WPM olarak
                        güncellendi.
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Pacer, RSVP ve sesli okuma bu değerden başlar; kitaplardaki
                      kayıtlı hızlar da aynı değere çekildi.
                    </p>
                    <Link
                      href="/library"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta hover:underline"
                    >
                      <span>Kitaplığa git</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed">
                      Anlama oranın %{CALIBRATION_MIN_COMPREHENSION} ve üzeri
                      olduğu için ulaştığın hızın %10 fazlası olan{" "}
                      <strong className="text-terracotta">
                        {recommendedWpm} WPM
                      </strong>{" "}
                      önerilir. Mevcut varsayılan hızın:{" "}
                      {readerPrefs.defaultWpm} WPM.
                    </p>
                    <button
                      onClick={() => handleApplyCalibration(recommendedWpm)}
                      className="w-full px-5 py-3 rounded-xl bg-sage hover:bg-sage/90 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Gauge className="w-4 h-4" />
                      <span>Smart Reader Hızımı Bu Değere Kalibre Et</span>
                    </button>
                  </>
                )
              ) : (
                <p className="text-sm text-muted leading-relaxed">
                  Anlama oranın %{CALIBRATION_MIN_COMPREHENSION} eşiğinin
                  altında kaldığı için hız artışı önerilmiyor. Mevcut hızında
                  anlama oranını yükseltmeye odaklan veya daha kolay bir
                  metinle testi tekrarla.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestart}
                className="px-5 py-3 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Başka Metinle Ölç</span>
              </button>
              <Link
                href="/drills"
                className="px-6 py-3 rounded-xl bg-terracotta hover:bg-terracotta/90 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-terracotta/20 transition-all"
              >
                <span>Egzersizlerle Hızını Artır</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border space-y-4">
            <h3 className="font-serif font-bold text-base">
              Anlama Soruları Cevap Anahtarı
            </h3>
            <div className="space-y-3">
              {article.questions.map((q, idx) => {
                const userAns = answers[q.id];
                const isCorrect = userAns === q.correct_option;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border ${
                      isCorrect
                        ? "bg-sage/5 border-sage/30"
                        : "bg-rose-500/5 border-rose-500/30"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-sage shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold">
                          {idx + 1}. {q.question_text}
                        </div>
                        <div className="text-xs text-muted">
                          Cevabın:{" "}
                          <span
                            className={
                              isCorrect
                                ? "text-sage font-semibold"
                                : "text-rose-400 font-semibold"
                            }
                          >
                            {q.options[userAns]}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="text-xs text-sage">
                            Doğru cevap:{" "}
                            <strong>{q.options[q.correct_option]}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Detailed Calibration & Historical Analytics */}
      <div className="pt-4 border-t border-border/70 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-terracotta mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Kalibrasyon Grafikleri</span>
            </div>
            <h2 className="text-xl font-serif font-bold">
              Ham Hız (WPM), Net Etkili Hız ve Anlama Oranı Analizi
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-xl bg-terracotta/15 border border-terracotta/30 text-terracotta font-bold">
              Güncel: {user.current_wpm} WPM
            </span>
            <span className="px-3 py-1 rounded-xl bg-sage/15 border border-sage/30 text-sage font-bold">
              Kavrama: %{user.comprehension_rate}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-3xl bg-surface border border-border space-y-4">
            <div>
              <h3 className="font-bold text-base">
                Görsel Algı Hızı (WPM) &amp; Net Etkili Hız (E-WPM)
              </h3>
              <p className="text-xs text-muted">
                Seviye testleri ve kitap okuma seanslarındaki hız gelişimi
              </p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="calWpmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        style={{ stopColor: "var(--accent-color)" }}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        style={{ stopColor: "var(--accent-color)" }}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="calEffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        style={{ stopColor: "var(--sage-color)" }}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        style={{ stopColor: "var(--sage-color)" }}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="wpm"
                    name="Ham Hız (WPM)"
                    stroke="var(--accent-color)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#calWpmGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="etkiliWpm"
                    name="Net Etkili Hız (E-WPM)"
                    stroke="var(--sage-color)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#calEffGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 p-6 rounded-3xl bg-surface border border-border space-y-4">
            <div>
              <h3 className="font-bold text-base">
                Anlama ve Odak Doğruluk Oranı (%)
              </h3>
              <p className="text-xs text-muted">
                Hız artarken bilişsel kavrama kalitesinin korunumu
              </p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar
                    dataKey="anlama"
                    name="Anlama / Doğruluk (%)"
                    fill="var(--sage-color)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Calibration history table */}
        <div className="p-6 rounded-3xl bg-surface border border-border space-y-4">
          <div>
            <h3 className="font-serif font-bold text-base">
              Geçmiş Kalibrasyon Kayıtları
            </h3>
            <p className="text-xs text-muted">
              Tamamlanan her seviye testi; en yeni kayıt en üstte.
            </p>
          </div>

          {historyRows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              Henüz kalibrasyon kaydı yok. İlk testi tamamladığında sonuçların
              burada listelenecek.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
                    <th className="py-2 pr-4 font-semibold">Tarih</th>
                    <th className="py-2 pr-4 font-semibold">Metin</th>
                    <th className="py-2 pr-4 font-semibold">Zorluk</th>
                    <th className="py-2 pr-4 font-semibold text-right">
                      Ham WPM
                    </th>
                    <th className="py-2 pr-4 font-semibold text-right">
                      Anlama (%)
                    </th>
                    <th className="py-2 font-semibold text-right">
                      Net E-WPM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted">
                        {new Date(row.completed_at).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold">
                        {row.article_title}
                      </td>
                      <td className="py-2.5 pr-4 text-muted">
                        {DIFFICULTY_LABELS[row.difficulty].label}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono">
                        {row.wpm}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono">
                        %{row.comprehension}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-terracotta">
                        {row.effective_wpm}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
