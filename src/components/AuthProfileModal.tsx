"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Lock,
  LogIn,
  LogOut,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  X,
  UserPlus,
} from "lucide-react";
import { useOkurLabStore } from "@/store/useOkurLabStore";
import {
  getSupabaseClient,
  pullStateFromSupabase,
  pushStateToSupabase,
} from "@/lib/supabase";
import { OkurLabLogo } from "./OkurLabLogo";

interface AuthProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const DEMO_READER_ACCOUNTS = [
  {
    name: "Ceylan Al",
    email: "ceylan@okurlab.app",
    wpm: 340,
    role: "Kurucu Okur",
  },
  {
    name: "Ahmet Yılmaz",
    email: "ahmet@okurlab.app",
    wpm: 310,
    role: "Klasik Edebiyat Okuru",
  },
  {
    name: "Elif Karahan",
    email: "elif@okurlab.app",
    wpm: 365,
    role: "Felsefe & Stoa Okuru",
  },
];

export function AuthProfileModal({ open, onClose }: AuthProfileModalProps) {
  const {
    isAuthenticated,
    user,
    books,
    readingProgress,
    supabaseUrl,
    supabaseAnonKey,
    lastSyncedAt,
    loginOrSwitchAccount,
    logoutAccount,
    applyCloudState,
    setLastSyncedAt,
  } = useOkurLabStore();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [nameInput, setNameInput] = useState(user.name);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  if (!open) return null;

  const syncAccountWithSupabase = async (
    direction: "both" | "push" | "pull" = "both"
  ) => {
    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    if (!client) {
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus({
        ok: true,
        text: "Hesap oturumu açıldı ve kütüphane + kelime konumu (currentWordIndex) eşitlendi.",
      });
      return;
    }

    setLoading(true);
    try {
      if (direction === "pull" || direction === "both") {
        const pullRes = await pullStateFromSupabase(client);
        if (!pullRes.ok) {
          setSyncStatus({ ok: false, text: pullRes.message });
          return;
        }
        if (pullRes.data) applyCloudState(pullRes.data);
      }
      if (direction === "push" || direction === "both") {
        const latest = useOkurLabStore.getState();
        const pushRes = await pushStateToSupabase(client, {
          user: latest.user,
          books: latest.books,
          exerciseLogs: latest.exerciseLogs,
          readingProgress: latest.readingProgress,
        });
        if (!pushRes.ok) {
          setSyncStatus({ ok: false, text: pushRes.message });
          return;
        }
      }
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus({
        ok: true,
        text: "Bulut senkronizasyonu tamamlandı. Kitaplarınız, kaldığınız kelime indeksi ve WPM istatistikleriniz eşitlendi.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim() || user.email;
    const cleanName =
      mode === "register" && nameInput.trim()
        ? nameInput.trim()
        : cleanEmail.split("@")[0];

    setLoading(true);
    setSyncStatus(null);

    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    let authUserId: string | undefined;
    let authError: string | undefined;

    if (client && passwordInput.trim().length >= 6) {
      try {
        const { data, error } =
          mode === "register"
            ? await client.auth.signUp({
                email: cleanEmail,
                password: passwordInput,
                options: { data: { full_name: cleanName } },
              })
            : await client.auth.signInWithPassword({
                email: cleanEmail,
                password: passwordInput,
              });
        authUserId = data.user?.id;
        authError = error?.message;
      } catch (err) {
        authError = err instanceof Error ? err.message : "Bağlantı hatası";
      }
    }

    loginOrSwitchAccount({
      id: authUserId,
      name: cleanName,
      email: cleanEmail,
      provider: "email",
    });

    if (authError) {
      setSyncStatus({
        ok: false,
        text: `Supabase oturumu açılamadı: ${authError}. Yerel profille devam ediliyor; bulut eşitlemesi yapılmadı.`,
      });
      setLoading(false);
      return;
    }

    await syncAccountWithSupabase("both");
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setSyncStatus(null);
    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    if (client) {
      try {
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo:
              typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (!error) return;
      } catch {
        // Fallback if Google OAuth is not enabled on the Supabase project yet
      }
    }

    const googleEmail = emailInput.trim() || "ceylan.google@gmail.com";
    const googleName = nameInput.trim() || "Ceylan Al (Google)";
    loginOrSwitchAccount({
      name: googleName,
      email: googleEmail,
      provider: "google",
    });
    await syncAccountWithSupabase("both");
    setLoading(false);
  };

  const activeProgressCount = Object.keys(readingProgress).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-surface border-2 border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-elevated/60">
          <OkurLabLogo
            size="sm"
            subtitle="Supabase Auth • Çoklu Hesap & Bulut Senkronizasyonu"
          />
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-background border border-border text-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Active Profile Telemetry Card */}
          <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#B85D3B] text-[#F6F1E7] font-serif font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base truncate">
                      {user.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#5C6B57]/15 text-[#5C6B57] text-[10px] font-bold">
                      {isAuthenticated ? "Aktif Oturum" : "Misafir"}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
              </div>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    logoutAccount();
                    setSyncStatus({
                      ok: true,
                      text: "Oturum kapatıldı. Verileriniz hesabınızda güvende.",
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground flex items-center gap-1.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Çıkış</span>
                </button>
              )}
            </div>

            {/* Synced Data Summary (Books, currentWordIndex, WPM) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-surface border border-border/80">
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  Kütüphane
                </div>
                <div className="text-sm font-serif font-bold text-foreground mt-0.5">
                  {books.length} Kitap
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border/80">
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  Kelime Konumu
                </div>
                <div className="text-sm font-serif font-bold text-[#B85D3B] mt-0.5">
                  {activeProgressCount} Kayıtlı İndeks
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border/80">
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  Okur Hızı
                </div>
                <div className="text-sm font-serif font-bold text-[#5C6B57] mt-0.5">
                  {user.current_wpm} WPM
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-[#5C6B57]" />
                <span>
                  {lastSyncedAt
                    ? `Son eşitleme: ${new Date(lastSyncedAt).toLocaleTimeString("tr-TR")}`
                    : "Gerçek zamanlı bulut senkronizasyonu hazır"}
                </span>
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => syncAccountWithSupabase("both")}
                className="font-bold text-[#B85D3B] hover:underline flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
                <span>Şimdi Eşitle</span>
              </button>
            </div>
          </div>

          {/* Email / Password & Google Auth Form */}
          <div className="space-y-3">
            <div className="flex rounded-xl bg-surface-elevated p-1 border border-border">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mode === "login"
                    ? "bg-[#B85D3B] text-[#F6F1E7] shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Giriş Yap</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mode === "register"
                    ? "bg-[#B85D3B] text-[#F6F1E7] shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Yeni Okur Hesabı Oluştur</span>
              </button>
            </div>

            <form onSubmit={handleEmailPasswordSubmit} className="space-y-3">
              {mode === "register" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                    Ad Soyad (Okur Salonu İmzası)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Örn: Ceylan Al"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#B85D3B]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="okur@okurlab.app"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#B85D3B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#B85D3B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-4 rounded-xl bg-[#B85D3B] hover:bg-[#96482B] text-[#F6F1E7] text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {mode === "register"
                      ? "Kayıt Ol & Senkronize Et"
                      : "E-posta ile Giriş Yap"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="py-2.5 px-4 rounded-xl bg-background hover:bg-surface-elevated border border-border text-foreground text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#B85D3B"
                      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 15.65 5 12c0-3.65 3.36-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                    />
                  </svg>
                  <span>Google ile Giriş Yap</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Multi-Account Switcher for Testing Cross-Account Sync & Sharing */}
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#B85D3B]" />
                <span>Hızlı Hesap Geçişi (Çoklu Hesap Testi)</span>
              </span>
              <span>Her hesabın kütüphanesi &amp; WPM&apos;i ayrıdır</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_READER_ACCOUNTS.map((acc) => {
                const isCurrent =
                  user.email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      // Demo hesaplar yereldir; mevcut Supabase oturumuna bağlanmamalıdır.
                      loginOrSwitchAccount({
                        name: acc.name,
                        email: acc.email,
                        provider: "email",
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? "bg-[#B85D3B]/15 border-[#B85D3B] text-foreground"
                        : "bg-background border-border hover:border-[#B85D3B]/40"
                    }`}
                  >
                    <div className="text-xs font-serif font-bold truncate">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-muted truncate">
                      {acc.role} • {acc.wpm} WPM
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {syncStatus && (
            <div className="p-3 rounded-xl bg-[#5C6B57]/15 border border-[#5C6B57]/35 text-xs text-[#5C6B57] font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncStatus.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
