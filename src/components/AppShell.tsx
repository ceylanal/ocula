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
  Settings,
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

const THEME_OPTIONS: {
  id: ThemeMode;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    id: "sepia",
    label: "Sıcak Sepya & Parşömen (Ana Tema)",
    desc: "#F6F1E7 parşömen kağıt ve #2C2520 espresso mürekkep",
    icon: BookMarked,
  },
  {
    id: "dark",
    label: "Gece Modu (Dark Sepia)",
    desc: "#1C1917 koyu kahve arka plan ve #D6CBB9 sıcak krem metin",
    icon: Moon,
  },
  {
    id: "light",
    label: "Açık Fildişi (Gün Modu)",
    desc: "Yumuşak antik beyaz kağıt dokusu",
    icon: Sun,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme, user, readerPrefs, updateReaderPrefs } =
    useSupereadStore();
  const [mounted, setMounted] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme: ThemeMode = mounted ? theme || "sepia" : "sepia";

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", activeTheme);
    }
  }, [activeTheme, mounted]);

  const currentWpm = mounted ? user.current_wpm : 340;
  const comprehension = mounted ? user.comprehension_rate : 85;
  const streak = mounted ? user.streak_days : 7;
  const targetPct = Math.min(100, Math.round((currentWpm / 600) * 100));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Desktop Left Sidebar */}
      <aside className="zen-chrome hidden md:flex md:w-[276px] lg:w-[292px] md:flex-col md:fixed md:inset-y-0 border-r border-border bg-surface/95 backdrop-blur-xl z-30 select-none transition-opacity duration-500">
        {/* Brand Header with Minimalist OkurLab Logo */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-border/80">
          <Link href="/">
            <OculaLogo
              size="md"
              subtitle="Sıcak Sepya Kitap & Okuma Laboratuvarı"
            />
          </Link>
        </div>

        {/* Live Telemetry Card */}
        <div className="px-4 pt-4">
          <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#B85D3B] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                OkurLab Günlüğü
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B85D3B]/15 text-[#B85D3B] text-[11px] font-bold">
                <Flame className="w-3 h-3 fill-[#B85D3B]" />
                {streak} Gün
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="p-2.5 rounded-xl bg-background/80 border border-border/80">
                <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
                  Okuma Hızı
                </div>
                <div className="text-xl font-serif font-bold tabular-nums tracking-tight flex items-baseline gap-1 mt-0.5">
                  {currentWpm}
                  <span className="text-[10px] font-sans font-semibold text-[#B85D3B]">
                    WPM
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-background/80 border border-border/80">
                <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
                  Anlama
                </div>
                <div className="text-xl font-serif font-bold tabular-nums tracking-tight text-[#5C6B57] mt-0.5">
                  %{comprehension}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Akıcı Okur Hedefi (600 WPM)</span>
                <span className="font-semibold text-foreground">
                  %{targetPct}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#B85D3B] to-[#5C6B57] transition-all duration-500"
                  style={{ width: `${targetPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
            Okuma Alanları
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
                    ? "bg-[#B85D3B] text-[#F6F1E7] shadow-md shadow-[#B85D3B]/20 font-semibold"
                    : "text-foreground/85 hover:bg-surface-elevated hover:text-foreground"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    isActive
                      ? "bg-white/15 text-[#F6F1E7]"
                      : "bg-background/80 border border-border text-muted group-hover:text-[#B85D3B] group-hover:border-[#B85D3B]/40"
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
                      isActive ? "text-[#F6F1E7]/85" : "text-muted"
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Cloud Sync / Mobile Share + Settings Button Footer */}
        <div className="p-4 border-t border-border/80 space-y-2.5">
          <button
            onClick={() => setCloudModalOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#5C6B57]/15 hover:bg-[#5C6B57] text-[#5C6B57] hover:text-[#F6F1E7] border border-[#5C6B57]/30 text-xs font-semibold flex items-center justify-between transition-all shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span>Telefona Kur &amp; Bulut</span>
            </span>
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-surface-elevated hover:bg-background border border-border text-xs font-semibold flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2 text-foreground">
              <Settings className="w-4 h-4 text-[#B85D3B]" />
              <span>Ayarlar &amp; Görünüm</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-background border border-border text-[10px] font-bold text-muted">
              {activeTheme === "sepia"
                ? "Sepya (Ana)"
                : activeTheme === "dark"
                ? "Dark Sepia"
                : "Fildişi"}
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="zen-chrome md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface/95 backdrop-blur-xl border-b border-border transition-opacity duration-500">
        <Link href="/">
          <OculaLogo size="sm" />
        </Link>

        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-1 rounded-xl bg-surface-elevated border border-border text-[11px] font-bold tabular-nums flex items-center gap-1.5">
            <span>{currentWpm} WPM</span>
            <span className="text-[#5C6B57]">%{comprehension}</span>
          </div>

          <button
            onClick={() => setCloudModalOpen(true)}
            className="p-2 rounded-xl bg-[#B85D3B]/15 border border-[#B85D3B]/30 text-[#B85D3B]"
            title="Paylaş & Bulut Eşitleme"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl bg-surface-elevated border border-border text-foreground"
            title="Ayarlar & Tema Modu"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 md:pl-[276px] lg:pl-[292px] pb-24 md:pb-10 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="zen-chrome md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-border grid grid-cols-4 py-1.5 px-2 transition-opacity duration-500">
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

      {/* Görünüm & Okuma Ayarları Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface border border-border p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-base">
                  Ayarlar &amp; Görünüm Modu
                </h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-xs font-semibold text-muted hover:text-foreground"
              >
                Kapat
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Renk &amp; Kağıt Teması (Varsayılan: Sepya)
              </div>
              <div className="space-y-2">
                {THEME_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = activeTheme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setTheme(opt.id)}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500 shadow-sm"
                          : "bg-surface-elevated/70 border-border hover:border-indigo-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-surface border border-border text-muted"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">{opt.label}</div>
                          <div className="text-xs text-muted">{opt.desc}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                          Aktif
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-border/70 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold">
                  Kademeli Hız Artışı (Auto-Ramp)
                </div>
                <div className="text-[11px] text-muted">
                  Okurken her 2 dakikada / 400 kelimede +10 WPM
                </div>
              </div>
              <button
                onClick={() =>
                  updateReaderPrefs({
                    autoRampEnabled: !readerPrefs.autoRampEnabled,
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  readerPrefs.autoRampEnabled
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-surface-elevated border-border text-muted"
                }`}
              >
                {readerPrefs.autoRampEnabled ? "AÇIK (+10 WPM)" : "KAPALI"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Sync & Share Modal */}
      <CloudSyncAndShareModal
        open={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
      />
    </div>
  );
}
