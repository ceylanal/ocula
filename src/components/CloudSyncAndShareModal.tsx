"use client";

import React, { useState } from "react";
import {
  Cloud,
  Share2,
  Smartphone,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  X,
  Database,
} from "lucide-react";
import { useSupereadStore } from "@/store/useSupereadStore";
import {
  getSupabaseClient,
  pullStateFromSupabase,
  pushStateToSupabase,
} from "@/lib/supabase";
import { KitUpLogo } from "./KitUpLogo";

const SUPABASE_SQL_SNIPPET = `create table if not exists public.users (
  id text primary key,
  email text not null,
  name text,
  current_wpm integer default 220,
  baseline_wpm integer default 215,
  comprehension_rate integer default 75,
  streak_days integer default 1,
  created_at timestamptz default now()
);
create table if not exists public.books (
  id text primary key,
  title text not null,
  author text not null,
  category text not null,
  difficulty_level text not null,
  word_count integer not null,
  cover_gradient text default 'from-indigo-600 via-violet-600 to-purple-700',
  summary text default '',
  content jsonb not null,
  questions jsonb default '[]'::jsonb,
  is_custom boolean default true,
  created_at timestamptz default now()
);
create table if not exists public.exercise_logs (
  id text primary key,
  user_id text not null,
  exercise_type text not null,
  achieved_wpm integer not null,
  accuracy_score integer not null,
  duration_seconds integer not null,
  label text,
  completed_at timestamptz default now()
);
create table if not exists public.user_reading_progress (
  id text primary key,
  user_id text not null,
  book_id text not null,
  current_word_index integer default 0,
  reading_mode text default 'standard',
  preferred_wpm integer default 320,
  updated_at timestamptz default now()
);
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.user_reading_progress enable row level security;
create policy "Public access users" on public.users for all using (true) with check (true);
create policy "Public access books" on public.books for all using (true) with check (true);
create policy "Public access logs" on public.exercise_logs for all using (true) with check (true);
create policy "Public access progress" on public.user_reading_progress for all using (true) with check (true);`;

interface CloudSyncAndShareModalProps {
  open: boolean;
  onClose: () => void;
}

export function CloudSyncAndShareModal({
  open,
  onClose,
}: CloudSyncAndShareModalProps) {
  const {
    user,
    books,
    exerciseLogs,
    readingProgress,
    supabaseUrl,
    supabaseAnonKey,
    lastSyncedAt,
    setSupabaseConfig,
    setLastSyncedAt,
    applyCloudState,
  } = useSupereadStore();

  const [tab, setTab] = useState<"mobile" | "supabase">("mobile");
  const [urlInput, setUrlInput] = useState(
    supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  );
  const [keyInput, setKeyInput] = useState(
    supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!open) return null;

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://kitup.vercel.app";

  const shareText = `📚 KitUp ile okuma hızımı ${user.current_wpm} WPM (%${user.comprehension_rate} anlama oranı) seviyesine çıkardım! Hızlı okuma egzersizleri ve akıllı PDF/EPUB okuyucu için dene:`;

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "KitUp — Hızlı Okuma ve Akıllı Kütüphane",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const handleCopySql = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const handlePushToCloud = async () => {
    setSupabaseConfig(urlInput.trim(), keyInput.trim());
    const client = getSupabaseClient(urlInput, keyInput);
    if (!client) {
      setStatusMsg({
        ok: false,
        text: "Lütfen geçerli bir Supabase Project URL ve Anon Key girin.",
      });
      return;
    }

    setSyncing(true);
    setStatusMsg(null);
    const res = await pushStateToSupabase(client, {
      user,
      books,
      exerciseLogs,
      readingProgress,
    });
    if (res.ok) {
      setLastSyncedAt(new Date().toISOString());
    }
    setStatusMsg({ ok: res.ok, text: res.message });
    setSyncing(false);
  };

  const handlePullFromCloud = async () => {
    setSupabaseConfig(urlInput.trim(), keyInput.trim());
    const client = getSupabaseClient(urlInput, keyInput);
    if (!client) {
      setStatusMsg({
        ok: false,
        text: "Lütfen geçerli bir Supabase Project URL ve Anon Key girin.",
      });
      return;
    }

    setSyncing(true);
    setStatusMsg(null);
    const res = await pullStateFromSupabase(client, user.id);
    if (res.ok && res.data) {
      applyCloudState(res.data);
    }
    setStatusMsg({ ok: res.ok, text: res.message });
    setSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-surface border-2 border-border shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-elevated/50">
          <KitUpLogo
            size="sm"
            subtitle="Mobil Kurulum, Paylaşım & Supabase Bulut"
          />
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-surface-elevated/30 border-b border-border">
          <button
            onClick={() => setTab("mobile")}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === "mobile"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Telefona Kur & Paylaş</span>
          </button>
          <button
            onClick={() => setTab("supabase")}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === "supabase"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Supabase Bulut Eşitleme</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {tab === "mobile" ? (
            <>
              {/* Share Score / App Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-surface-elevated border border-indigo-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-indigo-400">
                      Paylaşılabilir KitUp Kartı
                    </div>
                    <div className="text-xl font-extrabold mt-0.5">
                      {user.current_wpm} WPM • %{user.comprehension_rate} Anlama
                    </div>
                  </div>
                  <KitUpLogo size="md" showText={false} />
                </div>

                <p className="text-xs text-muted leading-relaxed bg-surface/80 p-3 rounded-xl border border-border">
                  &quot;{shareText}&quot;
                </p>

                <button
                  onClick={handleNativeShare}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Paylaşım Bağlantısı Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Arkadaşlarınla Paylaş (WhatsApp / iOS / Link)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Phone Home Screen Installation Guide */}
              <div className="p-5 rounded-2xl bg-surface-elevated border border-border space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>Telefonunuzda Tam Ekran Uygulama (PWA) Olarak Kullanın</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                    <div className="font-bold text-foreground">
                      iPhone / iOS (Safari)
                    </div>
                    <p className="text-muted leading-relaxed">
                      Vercel bağlantısını Safari&apos;de açın → Alttaki{" "}
                      <strong className="text-foreground">Paylaş</strong>{" "}
                      simgesine dokunun →{" "}
                      <strong className="text-indigo-400">
                        &quot;Ana Ekrana Ekle&quot;
                      </strong>{" "}
                      seçeneğine basın.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                    <div className="font-bold text-foreground">
                      Android (Chrome)
                    </div>
                    <p className="text-muted leading-relaxed">
                      Sağ üstteki üç nokta menüsüne dokunun →{" "}
                      <strong className="text-indigo-400">
                        &quot;Uygulamayı Yükle / Ana ekrana ekle&quot;
                      </strong>{" "}
                      seçeneğine basın.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* SUPABASE CLOUD SYNC TAB */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Supabase Bağlantı Ayarları</span>
                  </div>
                  <button
                    onClick={handleCopySql}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>SQL Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>1. SQL Tablo Kodunu Kopyala</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-muted font-medium">
                      Supabase Project URL (NEXT_PUBLIC_SUPABASE_URL)
                    </label>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full mt-1 rounded-xl bg-surface border border-border px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted font-medium">
                      Supabase Anon Public Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
                    </label>
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full mt-1 rounded-xl bg-surface border border-border px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Push & Pull Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  disabled={syncing}
                  onClick={handlePushToCloud}
                  className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {syncing ? "Eşitleniyor..." : "Buluta Yedekle (Push)"}
                  </span>
                </button>
                <button
                  disabled={syncing}
                  onClick={handlePullFromCloud}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>
                    {syncing ? "İndiriliyor..." : "Buluttan Telefona Çek (Pull)"}
                  </span>
                </button>
              </div>

              {lastSyncedAt && (
                <div className="text-[11px] text-muted text-center">
                  Son Bulut Eşitlemesi:{" "}
                  <strong className="text-foreground">
                    {new Date(lastSyncedAt).toLocaleString("tr-TR")}
                  </strong>
                </div>
              )}

              {statusMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium border ${
                    statusMsg.ok
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {statusMsg.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
