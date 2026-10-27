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
import { useSupereadStore } from "@/store/useSupereadStore";

type TestPhase = "intro" | "reading" | "quiz" | "result";

export default function SpeedTestPage() {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    SPEED_TEST_ARTICLES[0].id
  );
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [calculatedWpm, setCalculatedWpm] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comprehensionScore, setComprehensionScore] = useState<number>(0);

  const startTimeRef = useRef<number | null>(null);
  const { recordExercise, user, exerciseLogs } = useSupereadStore();

  const chartData = exerciseLogs.slice(-10).map((log, i) => ({
    name: log.label || `#${i + 1}`,
    wpm: log.achieved_wpm,
    anlama: log.accuracy_score,
    etkiliWpm: Math.round(log.achieved_wpm * (log.accuracy_score / 100)),
  }));

  const article =
    SPEED_TEST_ARTICLES.find((a) => a.id === selectedArticleId) ||
    SPEED_TEST_ARTICLES[0];

  // Stopwatch loop during 'reading' phase
  useEffect(() => {
    if (phase !== "reading") return;
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase]);

  const handleStartReading = () => {
    setElapsedMs(0);
    setAnswers({});
    setPhase("reading");
  };

  const handleFinishReading = () => {
    const finalMs = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : elapsedMs;
    // Prevent unrealistic accidental 1-second click from producing 20,000 WPM;
    // use actual elapsed seconds with a sensible minimum of 8s
    const actualSeconds = Math.max(8, finalMs / 1000);
    const wpm = Math.round((article.word_count / actualSeconds) * 60);

    setElapsedMs(finalMs);
    setCalculatedWpm(wpm);
    setPhase("quiz");
  };

  const handleSubmitQuiz = () => {
    const questions = article.questions;
    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_option) {
        correctCount++;
      }
    });

    const accuracyPct = Math.round((correctCount / questions.length) * 100);
    setComprehensionScore(accuracyPct);
    setPhase("result");

    recordExercise({
      exercise_type: "speed_test",
      achieved_wpm: calculatedWpm,
      accuracy_score: accuracyPct,
      duration_seconds: Math.max(1, Math.round(elapsedMs / 1000)),
    });
  };

  const allQuestionsAnswered = article.questions.every(
    (q) => typeof answers[q.id] === "number"
  );

  const formatSeconds = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins > 0 ? `${mins} dk ` : ""}${secs}.${tenths} sn`;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Kalibrasyon &amp; Analiz
          </h1>
          <p className="text-sm text-muted mt-1">
            WPM okuma hızınızı, kavrama oranınızı (%) kalibre edin ve detaylı hız/anlama grafiklerinizi inceleyin.
          </p>
        </div>

        {/* Phase Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`px-3 py-1 rounded-full border ${
              phase === "intro" || phase === "reading"
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-surface text-muted border-border"
            }`}
          >
            1. Hızlı Okuma
          </span>
          <span className="text-muted">→</span>
          <span
            className={`px-3 py-1 rounded-full border ${
              phase === "quiz"
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-surface text-muted border-border"
            }`}
          >
            2. Anlama Soruları (4)
          </span>
          <span className="text-muted">→</span>
          <span
            className={`px-3 py-1 rounded-full border ${
              phase === "result"
                ? "bg-emerald-600 text-white border-emerald-500"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SPEED_TEST_ARTICLES.map((item) => {
              const isSelected = item.id === selectedArticleId;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedArticleId(item.id)}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-500/10"
                      : "bg-surface border-border hover:border-indigo-500/40"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border font-semibold text-indigo-400">
                        {item.category}
                      </span>
                      <span className="text-muted font-medium">
                        {item.difficulty}
                      </span>
                    </div>
                    <h3 className="font-bold text-base leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border/60">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {item.word_count} kelime
                    </span>
                    <span>4 Anlama Sorusu</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-8 rounded-3xl bg-surface border-2 border-border text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
              <Timer className="w-7 h-7" />
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-xl font-bold">{article.title}</h2>
              <p className="text-sm text-muted leading-relaxed">
                <strong>&quot;Başla&quot;</strong> butonuna tıkladığınızda{" "}
                <strong>{article.word_count} kelimelik</strong> makale açılacak
                ve kronometre çalışmaya başlayacaktır. Metni doğal ama odaklı
                hızınızda okuyup bitirdiğinizde{" "}
                <strong>&quot;Okumayı Bitirdim&quot;</strong> butonuna basın. Ardından
                metne geri dönmeden 4 çoktan seçmeli soruyu yanıtlayın.
              </p>
            </div>

            <button
              onClick={handleStartReading}
              className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base inline-flex items-center gap-2.5 shadow-xl shadow-indigo-600/25 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Testi Başlat</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: ACTIVE READING WITH LIVE TIMER */}
      {phase === "reading" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-surface border-2 border-indigo-500/40 overflow-hidden shadow-2xl"
        >
          {/* Sticky Timer Header */}
          <div className="sticky top-0 z-20 px-6 py-4 bg-surface-elevated/95 backdrop-blur border-b border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                {article.category} • {article.word_count} Kelime
              </span>
              <h2 className="text-base sm:text-lg font-bold">{article.title}</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-xl bg-surface border border-border flex items-center gap-2 font-mono text-sm font-bold">
                <Timer className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>{formatSeconds(elapsedMs)}</span>
              </div>
            </div>
          </div>

          {/* Article Body */}
          <div className="p-6 sm:p-10 space-y-6 text-lg sm:text-xl leading-relaxed select-none">
            {article.paragraphs.map((p, idx) => (
              <p key={idx} className="text-foreground/95">
                {p}
              </p>
            ))}
          </div>

          {/* Finish Reading Footer CTA */}
          <div className="p-6 bg-surface-elevated border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-muted">
              Metnin tamamını okuduysanız süreyi durdurup anlama sorularına
              geçin.
            </span>
            <button
              onClick={handleFinishReading}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Okumayı Bitirdim ({formatSeconds(elapsedMs)})</span>
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
          <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-indigo-400" />
              <div>
                <div className="text-sm font-bold">
                  Okuma Süreniz Kaydedildi! Anlık Hızınız:{" "}
                  <span className="text-indigo-400">{calculatedWpm} WPM</span>
                </div>
                <div className="text-xs text-muted">
                  Şimdi anlama oranınızı (%) hesaplamak için aşağıdaki 4 soruyu
                  yanıtlayın.
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
                  <span className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
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
                            ? "bg-indigo-600/20 border-indigo-500 text-foreground font-semibold"
                            : "bg-surface-elevated/60 border-border text-foreground/80 hover:border-indigo-500/40"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full text-xs flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-500 text-white font-bold"
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
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/25"
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
          {/* Main Headline Result Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-600/25 via-emerald-600/15 to-surface border-2 border-indigo-500/40 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                Seviye Tespit Sonuç Raporu
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Okuma Hızınız:{" "}
                <span className="text-indigo-400">{calculatedWpm} WPM</span>{" "}
                <span className="text-muted font-light">|</span> Anlama Oranınız:{" "}
                <span className="text-emerald-400">%{comprehensionScore}</span>
              </h2>
              <p className="text-sm text-muted max-w-xl mx-auto">
                Net Etkili Okuma Hızınız (Hız × Anlama):{" "}
                <strong className="text-foreground">
                  {Math.round(calculatedWpm * (comprehensionScore / 100))} WPM
                </strong>{" "}
                • Başlangıç hızınız ({user.baseline_wpm} WPM) ile karşılaştırıldığında
                verileriniz Dashboard grafiklerinize kaydedildi.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPhase("intro")}
                className="px-5 py-3 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Başka Makale İle Ölç</span>
              </button>
              <Link
                href="/drills"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                <span>Egzersizlerle Hızını Artır</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Question Answer Breakdown */}
          <div className="p-6 rounded-3xl bg-surface border border-border space-y-4">
            <h3 className="font-bold text-base">Anlama Soruları Cevap Anahtarı</h3>
            <div className="space-y-3">
              {article.questions.map((q, idx) => {
                const userAns = answers[q.id];
                const isCorrect = userAns === q.correct_option;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border ${
                      isCorrect
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-rose-500/5 border-rose-500/30"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold">
                          {idx + 1}. {q.question_text}
                        </div>
                        <div className="text-xs text-muted">
                          Sizin Cevabınız:{" "}
                          <span
                            className={
                              isCorrect
                                ? "text-emerald-400 font-semibold"
                                : "text-rose-400 font-semibold"
                            }
                          >
                            {q.options[userAns]}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="text-xs text-emerald-400">
                            Doğru Cevap:{" "}
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

      {/* Detailed Calibration & Historical Analytics Charts */}
      <div className="pt-4 border-t border-border/70 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Detaylı Optik Telemetri &amp; Kalibrasyon Grafikleri</span>
            </div>
            <h2 className="text-xl font-extrabold">
              Ham Hız (WPM), Net Etkili Hız ve Anlama Oranı Analizi
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold">
              Güncel: {user.current_wpm} WPM
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
              Kavrama: %{user.comprehension_rate}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* WPM & Effective WPM AreaChart */}
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
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="calEffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-color)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="wpm"
                    name="Ham Hız (WPM)"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#calWpmGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="etkiliWpm"
                    name="Net Etkili Hız (E-WPM)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#calEffGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comprehension BarChart */}
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-color)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="anlama"
                    name="Anlama / Doğruluk (%)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
