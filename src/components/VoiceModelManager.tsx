"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, HardDrive, Loader2, Trash2 } from "lucide-react";
import {
  PIPER_VOICES,
  PiperVoiceId,
  VoiceModelStatus,
  deleteVoiceModel,
  getStorageEstimate,
  getVoiceModelStatus,
  isPiperWasmSupported,
  piperEngine,
} from "@/lib/piperAudioService";
import { formatBytes } from "@/lib/format";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

type StatusMap = Partial<Record<PiperVoiceId, VoiceModelStatus>>;

/**
 * Çevrimdışı sesli okuma modellerini listeler; indirme (ilerlemeyle), silme ve
 * kullanılan depolama alanını gösterir.
 */
export function VoiceModelManager() {
  const online = useOnlineStatus();
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [busy, setBusy] = useState<PiperVoiceId | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(
    null
  );
  const supported = isPiperWasmSupported();

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      PIPER_VOICES.map(async (v) => [v.id, await getVoiceModelStatus(v.id)] as const)
    );
    setStatuses(Object.fromEntries(entries));
    setEstimate(await getStorageEstimate());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDownload = async (voiceId: PiperVoiceId) => {
    setError(null);
    setBusy(voiceId);
    setProgress(0);
    try {
      await piperEngine.preloadVoice(voiceId, (p) => setProgress(p.percent));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Model indirilemedi.");
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  const handleDelete = async (voiceId: PiperVoiceId) => {
    setError(null);
    setBusy(voiceId);
    try {
      await deleteVoiceModel(voiceId);
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-muted">
          Çevrimdışı sesler
        </div>
        {estimate && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            <HardDrive className="w-3 h-3" />
            {formatBytes(estimate.usage)} / {formatBytes(estimate.quota)}
          </span>
        )}
      </div>

      {!supported && (
        <p className="text-[11px] text-muted leading-relaxed">
          Bu tarayıcı çevrimdışı sesi desteklemiyor; sesli okuma cihazın kendi
          sesine geçer.
        </p>
      )}

      <div className="space-y-2">
        {PIPER_VOICES.map((voice) => {
          const status = statuses[voice.id];
          const isBusy = busy === voice.id;
          const cached = status?.cached ?? false;
          return (
            <div
              key={voice.id}
              className="p-3 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{voice.label}</div>
                <div className="text-[11px] text-muted">
                  {isBusy && !cached
                    ? `İndiriliyor… %${progress}`
                    : cached
                    ? `İndirildi • ${
                        status?.bytes != null
                          ? formatBytes(status.bytes)
                          : `≈ ${voice.sizeMb} MB`
                      }`
                    : `İndirilmedi • ≈ ${voice.sizeMb} MB`}
                </div>
                {isBusy && !cached && (
                  <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-[#B85D3B] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {cached ? (
                <button
                  onClick={() => handleDelete(voice.id)}
                  disabled={busy !== null}
                  title="Sesi cihazdan sil"
                  className="px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-muted hover:text-[#B85D3B] disabled:opacity-50 flex items-center gap-1 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sil</span>
                </button>
              ) : (
                <button
                  onClick={() => handleDownload(voice.id)}
                  disabled={busy !== null || !supported || !online}
                  title={online ? "Sesi indir" : "İndirmek için çevrimiçi olmalısın"}
                  className="px-2.5 py-1.5 rounded-xl bg-[#B85D3B] text-[#F6F1E7] text-xs font-bold disabled:opacity-50 flex items-center gap-1 shrink-0"
                >
                  {isBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>İndir</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-[11px] text-rose-500 leading-relaxed">
          {error}
        </p>
      )}
      <p className="text-[11px] text-muted leading-relaxed">
        İndirilen sesler yalnızca bu cihazda saklanır ve internet olmadan çalışır.
        Silmek, o sese ilk kullanımda yeniden indirme gerektirir.
      </p>
    </div>
  );
}
