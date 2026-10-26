"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Zap,
  Brain,
  Flame,
  TrendingUp,
  CheckCircle2,
  Circle,
  ArrowRight,
  BookOpen,
  Eye,
  Gauge,
  Clock,
  RotateCcw,
  Sparkles,
  Crosshair,
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
import { useSupereadStore } from "@/store/useSupereadStore";
import { generateAlgorithmicDailyPlan } from "@/lib/dailyPlanner";

const EXERCISE_LABELS: Record<string, string> = {
  rsvp: "RSVP Odak",
  pacer: "Magic Pacer",
  schulte: "Schulte 5x5",
  speed_test: "Optik Seviye Testi",
  peripheral: "Çevresel Görüş",
};

export default function DashboardPage() {
  const {
    user,
    exerciseLogs,
    dailyTasks,
    toggleDailyTask,
    regenerateDailyPlan,
    books,
    readingProgress,
    resetDemoData,
  } = useSupereadStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-surface border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-surface border border-border"
            />
          ))}
        </div>
      </div>
    );
  }

  const effectiveWpm = Math.round(
    user.current_wpm * (user.comprehension_rate / 100)
  );
  const improvementPct = Math.round(
    ((user.current_wpm - user.baseline_wpm) /
      Math.max(1, user.baseline_wpm)) *
      100
  );

  const completedTasksCount = dailyTasks.filter((t) => t.completed).length;
  const routineProgressPct = Math.round(
    (completedTasksCount / Math.max(1, dailyTasks.length)) * 100
  );

  // Speed spectrum position (100 WPM to 800 WPM)
  const spectrumPositionPct = Math.min(
    98,
    Math.max(4, Math.round(((user.current_wpm - 100) / 700) * 100))
  );

  const speedTierLabel =
    user.current_wpm >= 550
      ? "Ocula Elit Görsel Atlet"
      : user.current_wpm >= 380
      ? "Parafoveal Blok Okuyucu"
      : user.current_wpm >= 260
      ? "Ritmik Sakkadik Okuyucu"
      : "İç Seslendirme Aşaması";

  const chartData = exerciseLogs.slice(-10).map((log, i) => ({
    name: log.label || `#${i + 1}`,
    wpm: log.achieved_wpm,
    anlama: log.accuracy_score,
    etkiliWpm: Math.round(log.achieved_wpm * (log.accuracy_score / 100)),
    tip: EXERCISE_LABELS[log.exercise_type] || log.exercise_type,
  }));

  const activeBook = books[0];
  const activeProg = activeBook ? readingProgress[activeBook.id] : undefined;
  const activeBookPct =
    activeBook && activeProg
      ? Math.min(
          100,
          Math.round(
            (activeProg.current_word_index /
              Math.max(1, activeBook.word_count)) *
              100
          )
        )
      : 18;

  const planMeta = generateAlgorithmicDailyPlan(
    user.current_wpm,
    user.comprehension_rate
  );

  return (
    <div className="space-y-7">
      {/* Hero Ocula Optical Command Center */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950/60 via-surface to-surface border border-indigo-500/30 p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Decorative Background Optical Rings */}
        <div className="pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full border border-indigo-500/15 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border border-violet-500/15 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 blur-xl" />
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                <span>Ocula • Göz Kasları ve Nöro-Görsel Algı Laboratuvarı</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                Göz Kasların Bugün{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">
                  {user.current_wpm} WPM
                </span>{" "}
                Frekansında Çalışıyor
              </h1>
              <p className="text-sm text-muted leading-relaxed">
                Başlangıç seviyen olan{" "}
                <strong className="text-foreground">
                  {user.baseline_wpm} WPM
                </strong>{" "}
                noktasından{" "}
                <strong className="text-emerald-400">
                  +{improvementPct}% ivmeyle
                </strong>{" "}
                yükseldin. Mevcut optik sınıfın:{" "}
                <strong className="text-indigo-400">{speedTierLabel}</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/drills"
                className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/25 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Optik Antrenmana Başla</span>
              </Link>
              <Link
                href="/speed-test"
                className="px-5 py-3.5 rounded-2xl bg-surface-elevated hover:bg-indigo-500/10 text-foreground border border-border hover:border-indigo-500/40 text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <Gauge className="w-4 h-4 text-indigo-400" />
                <span>Hızını Ölç</span>
              </Link>
            </div>
          </div>

          {/* Visual Ocula Speed Spectrum Bar */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted font-medium">
              <span>150 WPM (İç Seslendirme)</span>
              <span>300 WPM (Sakkadik Ritm)</span>
              <span>500 WPM (Parafoveal Blok)</span>
              <span>750+ WPM (Ocula Elit)</span>
            </div>
            <div className="relative h-2.5 w-full rounded-full bg-surface-elevated border border-border overflow-visible">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500 transition-all duration-500"
                style={{ width: `${spectrumPositionPct}%` }}
              />
              {/* Glowing Marker Dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-lg shadow-rose-500/50 transition-all duration-500"
                style={{ left: `${spectrumPositionPct}%` }}
                title={`Sizin Hızınız: ${user.current_wpm} WPM`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Key Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-border hover:border-indigo-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Görsel Okuma Hızı
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums">
              {user.current_wpm}
            </span>
            <span className="text-xs text-muted font-semibold">WPM</span>
          </div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              Başlangıca göre{" "}
              {improvementPct >= 0 ? `+${improvementPct}%` : `${improvementPct}%`}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border hover:border-emerald-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Bilişsel Kavrama Oranı
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums text-emerald-400">
              %{user.comprehension_rate}
            </span>
            <span className="text-xs text-muted font-semibold">Doğruluk</span>
          </div>
          <div className="text-xs text-muted">
            Optik seviye testi anlama ortalaması
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border hover:border-violet-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Net Etkili Hız (E-WPM)
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums text-violet-400">
              {effectiveWpm}
            </span>
            <span className="text-xs text-muted font-semibold">E-WPM</span>
          </div>
          <div className="text-xs text-muted">
            Ham Hız × Anlama Oranı net çıktısı
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border hover:border-amber-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Göz Kasları Disiplini
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums text-amber-400">
              {user.streak_days} Gün
            </span>
            <span className="text-xs text-muted font-semibold">Seri</span>
          </div>
          <div className="text-xs text-muted">
            Toplam {exerciseLogs.length} optik seans kaydedildi
          </div>
        </div>
      </div>

      {/* Middle Row: Algorithmic Daily Exercise Chain + Continue Smart Reader Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Phase 3: Algorithmic Daily Assigned Workout Chain */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-surface border border-border space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[11px] font-semibold mb-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Ocula Algoritmik Reçete • {planMeta.protocolBadge}</span>
              </div>
              <h2 className="text-lg font-bold">{planMeta.protocolName}</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={regenerateDailyPlan}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:border-indigo-500/50 border border-border text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Güncel WPM ve Anlama Oranınıza göre günlük 15 dk rutini yeniden hesapla"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Yeniden Kalibre Et</span>
              </button>
              <div className="text-right">
                <span className="text-sm font-bold text-indigo-400 tabular-nums">
                  {completedTasksCount} / {dailyTasks.length}
                </span>
                <div className="w-20 h-1.5 rounded-full bg-surface-elevated mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${routineProgressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Algorithmic Rationale Box */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <p className="text-muted leading-relaxed">
              <strong className="text-foreground">Nöro-Görsel Analiz:</strong>{" "}
              {planMeta.focusGoal}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border font-semibold text-indigo-400 tabular-nums">
                RSVP: {planMeta.recommendedRsvpWpm} WPM
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border font-semibold text-emerald-400 tabular-nums">
                Pacer: {planMeta.recommendedPacerWpm} WPM
              </span>
            </div>
          </div>

          {/* Stepper Task List */}
          <div className="space-y-3">
            {dailyTasks.map((task, idx) => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  task.completed
                    ? "bg-emerald-500/5 border-emerald-500/25"
                    : "bg-surface-elevated/60 border-border hover:border-indigo-500/40"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    onClick={() => toggleDailyTask(task.id)}
                    className="shrink-0 text-muted hover:text-indigo-400 transition-colors"
                    title="Tamamlandı olarak işaretle"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface border border-border text-indigo-400">
                        Adım {idx + 1}
                      </span>
                      <span
                        className={`font-semibold text-sm truncate ${
                          task.completed
                            ? "line-through text-muted"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {task.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted flex items-center gap-1 tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    {task.duration_label}
                  </span>
                  <Link
                    href={task.target_href}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <span>Başlat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Reader Quick Resume Card */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-surface border border-border flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Akıllı Okuyucu • Kaldığın Yerden
              </span>
              <Link
                href="/library"
                className="text-xs text-muted hover:text-foreground underline"
              >
                Tüm Kütüphane ({books.length})
              </Link>
            </div>

            {activeBook && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-surface-elevated border border-indigo-500/25 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      {activeBook.category}
                    </span>
                    <h3 className="text-lg font-bold mt-1.5">
                      {activeBook.title}
                    </h3>
                    <p className="text-xs text-muted">{activeBook.author}</p>
                  </div>
                  <div className="w-12 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg border border-white/15 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                  {activeBook.summary}
                </p>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Kitap İlerlemesi</span>
                    <span className="font-semibold tabular-nums">
                      %{activeBookPct}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${activeBookPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/library?book=${activeBook?.id || ""}&mode=pacer`}
              className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Magic Pacer ile Oku</span>
            </Link>
            <Link
              href={`/library?book=${activeBook?.id || ""}&mode=rsvp`}
              className="py-3 px-4 rounded-2xl bg-surface-elevated hover:bg-indigo-500/10 border border-border hover:border-indigo-500/40 text-foreground text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4 text-rose-500" />
              <span>RSVP Modunda Oku</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* WPM Progression Chart */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">
                Görsel Algı Hızı (WPM) ve Etkili Hız İvmesi
              </h3>
              <p className="text-xs text-muted">
                Son yapılan optik egzersiz ve seviye testlerindeki hız gelişimi
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 font-semibold">
              Elit Hedef: 600 WPM
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#wpmGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="etkiliWpm"
                  name="Net Etkili Hız (WPM)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#effGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comprehension & Accuracy Bar Chart */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-surface border border-border space-y-4">
          <div>
            <h3 className="font-bold text-base">
              Anlama ve Odak Doğruluk Oranı (%)
            </h3>
            <p className="text-xs text-muted">
              Hız artarken kavrama kalitesinin korunumu
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

      {/* Recent Exercise Logs Table */}
      <div className="p-6 rounded-3xl bg-surface border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">
              Son Optik Antrenman ve Test Kayıtları
            </h3>
            <p className="text-xs text-muted">
              Tamamlanan tüm egzersizler yerel ve bulut veritabanına kaydedilir
            </p>
          </div>
          <button
            onClick={resetDemoData}
            className="text-xs text-muted hover:text-foreground flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border transition-colors"
            title="Demo verilerini başlangıç durumuna sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Demo Verisini Sıfırla</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="py-2.5 px-3 font-medium">Modül / Egzersiz</th>
                <th className="py-2.5 px-3 font-medium">Ulaşılan Hız</th>
                <th className="py-2.5 px-3 font-medium">Anlama / Doğruluk</th>
                <th className="py-2.5 px-3 font-medium">Süre</th>
                <th className="py-2.5 px-3 font-medium">Gün</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 tabular-nums">
              {exerciseLogs
                .slice()
                .reverse()
                .slice(0, 6)
                .map((log) => (
                  <tr key={log.id} className="hover:bg-surface-elevated/40">
                    <td className="py-3 px-3 font-medium">
                      {EXERCISE_LABELS[log.exercise_type] || log.exercise_type}
                    </td>
                    <td className="py-3 px-3 font-bold text-indigo-400">
                      {log.achieved_wpm} WPM
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                        %{log.accuracy_score}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted">
                      {log.duration_seconds} sn
                    </td>
                    <td className="py-3 px-3 text-muted text-xs">
                      {log.label}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
