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
} from "lucide-react";
import { useSupereadStore } from "@/store/useSupereadStore";
import { ThemeMode } from "@/types";
import { KitUpLogo } from "./KitUpLogo";
import { CloudSyncAndShareModal } from "./CloudSyncAndShareModal";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    sublabel: "Plan & İlerleme",
    icon: LayoutDashboard,
  },
  {
    href: "/drills",
    label: "Egzersizler",
    sublabel: "RSVP • Pacer • Schulte",
    icon: Eye,
  },
  {
    href: "/library",
    label: "Kütüphane",
    sublabel: "Smart Reader • PDF & EPUB",
    icon: BookOpen,
  },
  {
    href: "/speed-test",
    label: "Seviye Testi",
    sublabel: "WPM & Anlama Ölçümü",
    icon: Gauge,
  },
];

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: React.ElementType }[] = [
  { id: "dark", label: "Koyu", icon: Moon },
  { id: "light", label: "Açık", icon: Sun },
  { id: "sepia", label: "Sepia", icon: BookMarked },
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-surface z-30 select-none">
        {/* Brand Header with Minimal KitUp Logo */}
        <div className="p-6 flex items-center justify-between border-b border-border">
          <Link href="/">
            <KitUpLogo
              size="md"
              subtitle="Hızlı Okuma & Akıllı Kütüphane"
            />
          </Link>
        </div>

        {/* Live User Speed Snapshot */}
        <div className="px-4 pt-4">
          <div className="p-3.5 rounded-xl bg-surface-elevated border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Güncel Hız
              </div>
              <div className="text-xl font-bold tracking-tight flex items-baseline gap-1">
                {currentWpm}
                <span className="text-xs font-normal text-muted">WPM</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Anlama
              </div>
              <div className="text-xl font-bold tracking-tight text-emerald-500">
                %{comprehension}
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                <Flame className="w-4 h-4 fill-amber-500" />
                {streak}g
              </div>
              <span className="text-[10px] text-muted">Seri</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
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
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-medium"
                    : "text-foreground/80 hover:bg-surface-elevated hover:text-foreground"
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-white" : "text-muted"
                  }`}
                />
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
        <div className="p-4 border-t border-border space-y-3">
          <button
            onClick={() => setCloudModalOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 hover:from-indigo-600 hover:to-purple-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span>Telefona Kur & Bulut</span>
            </span>
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center justify-between text-xs text-muted px-1">
            <span>Okuma Teması</span>
            <span className="capitalize font-medium text-foreground">
              {theme === "dark" ? "Koyu" : theme === "light" ? "Açık" : "Sepia"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-elevated border border-border">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mounted && theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
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
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface/95 backdrop-blur border-b border-border">
        <Link href="/">
          <KitUpLogo size="sm" />
        </Link>

        <div className="flex items-center gap-1.5">
          <div className="px-2 py-1 rounded-lg bg-surface-elevated border border-border text-[11px] font-semibold flex items-center gap-1.5">
            <span>{currentWpm} WPM</span>
            <span className="text-emerald-500">%{comprehension}</span>
          </div>

          <button
            onClick={() => setCloudModalOpen(true)}
            className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400"
            title="Paylaş & Bulut Eşitleme"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center rounded-lg bg-surface-elevated border border-border p-0.5">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mounted && theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  title={opt.label}
                  className={`p-1.5 rounded-md transition-colors ${
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
      <main className="flex-1 md:pl-64 lg:pl-72 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border grid grid-cols-4 py-1.5 px-2 pb-safe">
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
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
                isActive ? "text-indigo-500 font-semibold" : "text-muted"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
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
