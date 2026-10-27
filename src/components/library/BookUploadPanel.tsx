import React from "react";
import { Upload } from "lucide-react";
import type { BookVisibility } from "@/types";
import { VISIBILITY_OPTIONS } from "./visibilityOptions";

interface BookUploadPanelProps {
  visibility: BookVisibility;
  onVisibilityChange: (visibility: BookVisibility) => void;
  isDragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void;
  isParsing: boolean;
  parsingStatus: string;
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessFile: (file: File) => Promise<void>;
  onClose: () => void;
}

export function BookUploadPanel({
  visibility,
  onVisibilityChange,
  isDragging,
  onDraggingChange,
  onDrop,
  isParsing,
  parsingStatus,
  error,
  fileInputRef,
  onFileChange,
  onProcessFile,
  onClose,
}: BookUploadPanelProps) {
  return (
    <div className="p-6 rounded-3xl bg-surface border-2 border-dashed border-[#B85D3B]/50 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif font-bold text-base">
            Kütüphaneye PDF veya E-Kitap Yükle &amp; Paylaşım Ayarı Seç
          </h3>
          <p className="text-xs text-muted">
            PDF sayfaları ve EPUB bölümleri otomatik olarak temiz
            paragraflara ve kelime dizilerine dönüştürülür.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-semibold text-muted hover:text-foreground"
        >
          Kapat
        </button>
      </div>

      {/* 3 Visibility Selector Cards before uploading */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted block">
          Kitap Görünürlük &amp; Paylaşım Seçeneği
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {VISIBILITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = visibility === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onVisibilityChange(opt.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  active
                    ? "bg-[#B85D3B]/15 border-[#B85D3B] shadow-sm"
                    : "bg-background/70 border-border hover:border-[#B85D3B]/40"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    active
                      ? "bg-[#B85D3B] text-[#F6F1E7]"
                      : "bg-surface border border-border text-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5 leading-snug">
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            onDraggingChange(true);
          }}
          onDragLeave={() => onDraggingChange(false)}
          onDrop={onDrop}
          className={`flex-1 w-full cursor-pointer p-8 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-2.5 ${
            isDragging
              ? "bg-[#B85D3B]/20 border-[#B85D3B] scale-[1.01]"
              : "bg-background hover:bg-[#B85D3B]/10 border-border hover:border-[#B85D3B]/40"
          }`}
        >
          <Upload className="w-8 h-8 text-[#B85D3B]" />
          <div className="text-sm font-serif font-bold">
            {isParsing
              ? parsingStatus || "Dosya Dönüştürülüyor..."
              : ".pdf, .epub, .txt veya .md Dosyası Seçin / Sürükleyin"}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="px-2 py-0.5 rounded bg-[#B85D3B]/15 text-[#B85D3B] font-semibold">
              PDF
            </span>
            <span className="px-2 py-0.5 rounded bg-[#5C6B57]/15 text-[#5C6B57] font-semibold">
              EPUB
            </span>
            <span className="px-2 py-0.5 rounded bg-surface border border-border text-foreground font-semibold">
              TXT / MD
            </span>
            <span>sayfa numaraları ve tirelemeler otomatik temizlenir</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub,.txt,.md,.markdown,application/pdf,application/epub+zip,text/plain,text/markdown"
            onChange={onFileChange}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <span className="text-xs text-muted">
          Hızlı Test: Hazır örnek PDF veya Markdown dosyasını tek tıkla
          dönüştürüp deneyebilirsiniz:
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isParsing}
            onClick={async () => {
              const res = await fetch("/ornek-hizli-okuma-kitabi.pdf");
              const blob = await res.blob();
              const samplePdf = new File(
                [blob],
                "ornek-hizli-okuma-kitabi.pdf",
                { type: "application/pdf" }
              );
              await onProcessFile(samplePdf);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#B85D3B]/15 hover:bg-[#B85D3B]/25 border border-[#B85D3B]/30 text-[#B85D3B] text-xs font-semibold transition-all"
          >
            Örnek PDF Dönüştür (.pdf)
          </button>
          <button
            type="button"
            disabled={isParsing}
            onClick={async () => {
              const res = await fetch("/ornek-kitap.md");
              const blob = await res.blob();
              const sampleMd = new File([blob], "ornek-kitap.md", {
                type: "text/markdown",
              });
              await onProcessFile(sampleMd);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#5C6B57]/15 hover:bg-[#5C6B57]/25 border border-[#5C6B57]/30 text-[#5C6B57] text-xs font-semibold transition-all"
          >
            Örnek Markdown Dönüştür (.md)
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-[#B85D3B] font-medium">{error}</p>
      )}
    </div>
  );
}
