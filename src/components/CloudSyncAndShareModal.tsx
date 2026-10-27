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
import { useOkurLabStore } from "@/store/useOkurLabStore";
import {
  getSupabaseClient,
  pullStateFromSupabase,
  pushStateToSupabase,
} from "@/lib/supabase";
import { OkurLabLogo } from "./OkurLabLogo";

import SUPABASE_SQL_SNIPPET from "../../supabase/schema.sql";

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
  } = useOkurLabStore();

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
      : "https://ocula-read.vercel.app";

  const shareText = `📖 OkurLab ile sıcak sepya kağıt üzerinde okuma hızımı ${user.current_wpm} WPM (%${user.comprehension_rate} anlama oranı) seviyesine çıkardım! Sen de dene:`;

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "OkurLab — Sıcak Sepya Kitap Stüdyosu & Okuma Laboratuvarı",
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
    const res = await pullStateFromSupabase(client);
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
          <OkurLabLogo
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
                      Paylaşılabilir OkurLab Okuma Kartı
                    </div>
                    <div className="text-xl font-extrabold mt-0.5">
                      {user.current_wpm} WPM • %{user.comprehension_rate} Anlama
                    </div>
                  </div>
                  <OkurLabLogo size="md" showText={false} />
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
