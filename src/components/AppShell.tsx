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
  Sparkles,
  Settings,
  Users,
  User,
  WifiOff,
} from "lucide-react";
import { useOkurLabStore } from "@/store/useOkurLabStore";
import { ThemeMode } from "@/types";
import { OkurLabLogo } from "./OkurLabLogo";
import { CloudSyncAndShareModal } from "./CloudSyncAndShareModal";
import { AuthProfileModal } from "./AuthProfileModal";
import { VoiceModelManager } from "./VoiceModelManager";
import { getSupabaseClient, pushStateToSupabase } from "@/lib/supabase";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

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
    sublabel: "Smart Reader • Paylaş & Keşfet",
    icon: BookOpen,
  },
  {
    href: "/community",
    label: "Okur Salonu",
    sublabel: "İncelemeler • Alıntı Kartları",
    icon: Users,
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
  const {
    theme,
    setTheme,
    isAuthenticated,
    onboardingDone,
    user,
    books,
    readingProgress,
    exerciseLogs,
    supabaseUrl,
    supabaseAnonKey,
    readerPrefs,
    updateReaderPrefs,
  } = useOkurLabStore();
  const [mounted, setMounted] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const online = useOnlineStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Okur Salonu gibi sayfalar giriş modalını bu olayla açar
  useEffect(() => {
    const open = () => setAuthModalOpen(true);
    window.addEventListener("okurlab:open-auth", open);
    return () => window.removeEventListener("okurlab:open-auth", open);
  }, []);

  const activeTheme: ThemeMode = mounted ? theme || "sepia" : "sepia";

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", activeTheme);
    }
  }, [activeTheme, mounted]);

  // Real-time background Supabase synchronization when books, currentWordIndex, or WPM change
  useEffect(() => {
    if (!mounted || !isAuthenticated || !online) return;
    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    if (!client) return;
    const timer = setTimeout(() => {
      pushStateToSupabase(client, {
        user,
        books,
        exerciseLogs,
        readingProgress,
        bookNotes: useOkurLabStore.getState().bookNotes,
      }).catch(() => {});
    }, 1800);
    return () => clearTimeout(timer);
  }, [
    mounted,
    isAuthenticated,
    online,
    user.current_wpm,
    books.length,
    readingProgress,
    supabaseUrl,
    supabaseAnonKey,
  ]);

  const currentWpm = mounted ? user.current_wpm : 340;
  const comprehension = mounted ? user.comprehension_rate : 85;
  const streak = mounted ? user.streak_days : 7;
  const targetPct = Math.min(100, Math.round((currentWpm / 600) * 100));

  // İlk ziyarette ana sayfa yalnızca okuma ekranıdır: kenar çubuğu, alt gezinme ve
  // paneller yoktur. Kalıcı durum yüklenene kadar da aynı boş kâğıt gösterilir.
  if (pathname === "/" && (!mounted || !onboardingDone)) {
    return (
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Desktop Left Sidebar */}
      <aside className="zen-chrome hidden md:flex md:w-[276px] lg:w-[292px] md:flex-col md:fixed md:inset-y-0 border-r border-border bg-surface/95 backdrop-blur-xl z-30 select-none transition-opacity duration-500">
        {/* Brand Header with Minimalist OkurLab Logo */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-border/80">
          <Link href="/">
            <OkurLabLogo
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

        {/* Auth Profile + Cloud Sync / Mobile Share + Settings Button Footer */}
        <div className="p-4 border-t border-border/80 space-y-2">
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#B85D3B]/15 hover:bg-[#B85D3B] text-[#2C2520] hover:text-[#F6F1E7] border border-[#B85D3B]/35 text-xs font-semibold flex items-center justify-between transition-all shadow-sm group"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-6 h-6 rounded-lg bg-[#B85D3B] text-[#F6F1E7] flex items-center justify-center text-[11px] font-bold shrink-0">
                {isAuthenticated
                  ? (user?.name || "O").slice(0, 1).toUpperCase()
                  : "G"}
              </span>
              <span className="truncate font-serif font-bold">
                {isAuthenticated ? user.name : "Giriş Yap / Profil"}
              </span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-background/80 text-[10px] font-bold text-[#5C6B57] group-hover:text-[#2C2520] shrink-0">
              {isAuthenticated ? "Senkron" : "Bulut"}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCloudModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-[#5C6B57]/15 hover:bg-[#5C6B57] text-[#5C6B57] hover:text-[#F6F1E7] border border-[#5C6B57]/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Cihaz &amp; Kur</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="py-2 px-3 rounded-xl bg-surface-elevated hover:bg-background border border-border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all text-foreground"
            >
              <Settings className="w-3.5 h-3.5 text-[#B85D3B]" />
              <span>Görünüm</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="zen-chrome md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface/95 backdrop-blur-xl border-b border-border transition-opacity duration-500">
        <Link href="/">
          <OkurLabLogo size="sm" />
        </Link>

        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-1 rounded-xl bg-surface-elevated border border-border text-[11px] font-bold tabular-nums flex items-center gap-1.5">
            <span>{currentWpm} WPM</span>
            <span className="text-[#5C6B57]">%{comprehension}</span>
          </div>

          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#B85D3B]/15 border border-[#B85D3B]/35 text-[#B85D3B] text-[11px] font-bold flex items-center gap-1"
            title="Giriş Yap / Profil"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">
              {isAuthenticated ? user.name.split(" ")[0] : "Giriş"}
            </span>
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
          {mounted && !online && (
            <div
              role="status"
              className="mb-5 px-4 py-3 rounded-2xl bg-[#E6D2B5] text-[#2C2520] border border-[#B85D3B]/40 text-xs font-semibold flex items-center gap-2.5"
            >
              <WifiOff className="w-4 h-4 text-[#B85D3B] shrink-0" />
              <span>
                Çevrimdışısın. Notların ve okuma konumların bu cihazda saklanıyor;
                bağlantı gelince eşitlenir. Topluluk özellikleri çevrimiçi gerektirir.
              </span>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="zen-chrome md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-border grid grid-cols-5 py-1.5 px-1.5 transition-opacity duration-500">
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
                isActive ? "text-[#B85D3B] font-bold" : "text-muted"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-[68px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Görünüm & Okuma Ayarları Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-surface border border-border p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#B85D3B]" />
                <h3 className="font-serif font-bold text-base">
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
                Renk &amp; Kağıt Teması (Varsayılan: Sıcak Sepya)
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
                          ? "bg-[#B85D3B]/15 border-[#B85D3B] shadow-sm"
                          : "bg-surface-elevated/70 border-border hover:border-[#B85D3B]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? "bg-[#B85D3B] text-[#F6F1E7]"
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
                        <span className="px-2.5 py-0.5 rounded-full bg-[#B85D3B] text-[#F6F1E7] text-[10px] font-bold">
                          Aktif
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-border/70">
              <VoiceModelManager />
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
                    ? "bg-[#5C6B57]/15 border-[#5C6B57]/40 text-[#5C6B57]"
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

      {/* Supabase Auth & Multi-Account Profile Modal */}
      <AuthProfileModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
