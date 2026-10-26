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
  speed_test: "Seviye Testi",
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
        <div className="h-32 rounded-3xl bg-surface border border-border" />
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

  const chartData = exerciseLogs.slice(-10).map((log, i) => ({
    name: log.label || `#${i + 1}`,
    wpm: log.achieved_wpm,
    anlama: log.accuracy_score,
    etkiliWpm: Math.round(log.achieved_wpm * (log.accuracy_score / 100)),
    tip: EXERCISE_LABELS[log.exercise_type] || log.exercise_type,
  }));

  // Find active book in progress
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

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Actions Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-surface border border-indigo-500/25 p-6 sm:p-8 overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Bilişsel Okuma ve Görsel Algı Merkezi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hoş geldin, {user.name.split(" ")[0]}! Bugün zihnini hızlandırmaya
              hazır mısın?
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Başlangıç hızın olan{" "}
              <strong className="text-foreground">
                {user.baseline_wpm} WPM
              </strong>{" "}
              seviyesinden{" "}
              <strong className="text-indigo-400">
                {user.current_wpm} WPM
              </strong>{" "}
              seviyesine ulaştın. Günlük 15 dakikalık egzersiz zincirini
              tamamlayarak görsel ritmini koru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/drills"
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Egzersizlere Başla</span>
            </Link>
            <Link
              href="/speed-test"
              className="px-5 py-3 rounded-2xl bg-surface hover:bg-surface-elevated text-foreground border border-border text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <Gauge className="w-4 h-4 text-indigo-400" />
              <span>Hızını Ölç</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Key KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Güncel Okuma Hızı
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{user.current_wpm}</span>
            <span className="text-xs text-muted font-medium">WPM</span>
          </div>
          <div className="text-xs text-emerald-500 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              Başlangıca göre {improvementPct >= 0 ? `+${improvementPct}%` : `${improvementPct}%`}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Anlama Oranı
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-500">
              %{user.comprehension_rate}
            </span>
            <span className="text-xs text-muted font-medium">Doğruluk</span>
          </div>
          <div className="text-xs text-muted">
            Son seviye tespit sınavı ortalaması
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Net Etkili Hız
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-violet-400">
              {effectiveWpm}
            </span>
            <span className="text-xs text-muted font-medium">E-WPM</span>
          </div>
          <div className="text-xs text-muted">
            Hız × Anlama Oranı dengeli skoru
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Antrenman Serisi
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-500">
              {user.streak_days} Gün
            </span>
            <span className="text-xs text-muted font-medium">Kesintisiz</span>
          </div>
          <div className="text-xs text-muted">
            Toplam {exerciseLogs.length} antrenman tamamlandı
          </div>
        </div>
      </div>

      {/* Middle Row: Algorithmic Daily Exercise Chain + Continue Smart Reader Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Phase 3: Algorithmic Daily Assigned Workout Chain */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-surface border border-border space-y-5">
          {(() => {
            const planMeta = generateAlgorithmicDailyPlan(
              user.current_wpm,
              user.comprehension_rate
            );
            return (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[11px] font-semibold mb-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Faz 3 • {planMeta.protocolBadge}</span>
                    </div>
                    <h2 className="text-lg font-bold">
                      {planMeta.protocolName}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={regenerateDailyPlan}
                      className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:border-indigo-500/50 border border-border text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Güncel WPM ve Anlama Oranınıza göre günlük 15 dk rutini yeniden hesapla"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Algoritmik Kalibre Et</span>
                    </button>
                    <div className="text-right">
                      <span className="text-sm font-bold text-indigo-400">
                        {completedTasksCount} / {dailyTasks.length}
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-surface-elevated mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${routineProgressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Algorithmic Rationale Box */}
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <p className="text-muted leading-relaxed">
                    <strong className="text-foreground">Algoritma Analizi:</strong>{" "}
                    {planMeta.focusGoal}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-surface border border-border font-semibold text-indigo-400">
                      Hedef RSVP: {planMeta.recommendedRsvpWpm} WPM
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-surface border border-border font-semibold text-emerald-400">
                      Pacer: {planMeta.recommendedPacerWpm} WPM
                    </span>
                  </div>
                </div>
              </>
            );
          })()}

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
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-border text-muted">
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
                  <span className="text-xs text-muted flex items-center gap-1">
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
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
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
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-surface-elevated border border-indigo-500/20 space-y-3">
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
                  <div className="w-11 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                  {activeBook.summary}
                </p>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Okuma İlerlemesi</span>
                    <span className="font-semibold">%{activeBookPct}</span>
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
              className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Magic Pacer ile Oku</span>
            </Link>
            <Link
              href={`/library?book=${activeBook?.id || ""}&mode=rsvp`}
              className="py-3 px-4 rounded-2xl bg-surface-elevated hover:bg-indigo-500/10 border border-border hover:border-indigo-500/40 text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-all"
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
                WPM ve Etkili Okuma Hızı Gelişimi
              </h3>
              <p className="text-xs text-muted">
                Son yapılan egzersiz ve seviye testlerindeki hız ivmesi
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-semibold">
              Hedef: 500 WPM
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
            <h3 className="font-bold text-base">Son Egzersiz ve Test Kayıtları</h3>
            <p className="text-xs text-muted">
              Tamamlanan tüm antrenmanlar otomatik olarak yerel veritabanına
              işlenir
            </p>
          </div>
          <button
            onClick={resetDemoData}
            className="text-xs text-muted hover:text-foreground flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border transition-colors"
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
            <tbody className="divide-y divide-border/60">
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
