"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Eye,
  BookOpen,
  Gauge,
  Moon,
  Sun,
  BookMarked,
  Flame,
  Cloud,
  Share2,
  Sparkles,
} from "lucide-react";
import { useSupereadStore } from "@/store/useSupereadStore";
import { ThemeMode } from "@/types";
import { OculaLogo } from "./OculaLogo";
import { CloudSyncAndShareModal } from "./CloudSyncAndShareModal";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Okuma Stüdyosu",
    sublabel: "Aktif Kitap • PDF Yükle • Rutin",
    icon: LayoutDashboard,
  },
  {
    href: "/library",
    label: "Kitaplığım & PDF",
    sublabel: "Smart Reader • Auto-Ramp",
    icon: BookOpen,
  },
  {
    href: "/drills",
    label: "Göz Isınma (Drills)",
    sublabel: "Okuma Öncesi 2dk Isınma",
    icon: Eye,
  },
  {
    href: "/speed-test",
    label: "Kalibrasyon & Analiz",
    sublabel: "Seviye Testi & Detaylı Grafik",
    icon: Gauge,
  },
];

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: React.ElementType }[] = [
  { id: "dark", label: "Gece", icon: Moon },
  { id: "light", label: "Gün", icon: Sun },
  { id: "sepia", label: "Kağıt", icon: BookMarked },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme, user } = useSupereadStore();
  const [mounted, setMounted] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, mounted]);

  const currentWpm = mounted ? user.current_wpm : 340;
  const comprehension = mounted ? user.comprehension_rate : 85;
  const streak = mounted ? user.streak_days : 7;
  const targetPct = Math.min(100, Math.round((currentWpm / 600) * 100));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-[276px] lg:w-[292px] md:flex-col md:fixed md:inset-y-0 border-r border-border bg-surface/90 backdrop-blur-xl z-30 select-none">
        {/* Brand Header with Minimal Ocula Optical Logo */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-border/80">
          <Link href="/">
            <OculaLogo
              size="md"
              subtitle="Nöro-Görsel Algı & Okuma Sistemi"
            />
          </Link>
        </div>

        {/* Live Telemetry Card */}
        <div className="px-4 pt-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-surface-elevated to-surface-elevated border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Ocula Telemetri
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-bold">
                <Flame className="w-3 h-3 fill-amber-400" />
                {streak} Gün
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="p-2.5 rounded-xl bg-surface/80 border border-border/80">
                <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
                  Algı Hızı
                </div>
                <div className="text-xl font-extrabold tabular-nums tracking-tight flex items-baseline gap-1 mt-0.5">
                  {currentWpm}
                  <span className="text-[10px] font-semibold text-indigo-400">
                    WPM
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface/80 border border-border/80">
                <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
                  Anlama
                </div>
                <div className="text-xl font-extrabold tabular-nums tracking-tight text-emerald-400 mt-0.5">
                  %{comprehension}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Elit Görsel Atlet Hedefi (600 WPM)</span>
                <span className="font-semibold text-foreground">
                  %{targetPct}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${targetPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted/70">
            Modüller
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 font-semibold"
                    : "text-foreground/80 hover:bg-surface-elevated hover:text-foreground"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "bg-surface-elevated border border-border text-muted group-hover:text-indigo-400 group-hover:border-indigo-500/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm leading-tight truncate">
                    {item.label}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isActive ? "text-indigo-100/90" : "text-muted"
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Cloud Sync / Mobile Share + Theme Switcher Footer */}
        <div className="p-4 border-t border-border/80 space-y-3">
          <button
            onClick={() => setCloudModalOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-violet-500/15 to-rose-500/15 hover:from-indigo-600 hover:to-violet-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-between transition-all shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span>Telefona Kur & Bulut</span>
            </span>
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-elevated border border-border">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mounted && theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-surface text-foreground shadow-sm border border-border"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface/90 backdrop-blur-xl border-b border-border">
        <Link href="/">
          <OculaLogo size="sm" />
        </Link>

        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-1 rounded-xl bg-surface-elevated border border-border text-[11px] font-bold tabular-nums flex items-center gap-1.5">
            <span>{currentWpm} WPM</span>
            <span className="text-emerald-400">%{comprehension}</span>
          </div>

          <button
            onClick={() => setCloudModalOpen(true)}
            className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400"
            title="Paylaş & Bulut Eşitleme"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center rounded-xl bg-surface-elevated border border-border p-0.5">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mounted && theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  title={opt.label}
                  className={`p-1.5 rounded-lg transition-colors ${
                    active ? "bg-indigo-600 text-white" : "text-muted"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 md:pl-[276px] lg:pl-[292px] pb-24 md:pb-10 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/90 backdrop-blur-xl border-t border-border grid grid-cols-4 py-1.5 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
                isActive ? "text-indigo-400 font-bold" : "text-muted"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[76px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Cloud Sync & Share Modal */}
      <CloudSyncAndShareModal
        open={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
      />
    </div>
  );
}
