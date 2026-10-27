import React from "react";
import { Highlighter, MessageSquarePlus, Quote, Share2 } from "lucide-react";

export interface SelectionMenuState {
  text: string;
  wordIndex: number;
  showNoteInput: boolean;
  noteDraft: string;
}

interface AnnotationSelectionMenuProps {
  selection: SelectionMenuState;
  onClose: () => void;
  onHighlight: () => void;
  onToggleNoteInput: () => void;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: (e: React.FormEvent) => void;
  onShareQuote: () => void;
}

export function AnnotationSelectionMenu({
  selection,
  onClose,
  onHighlight,
  onToggleNoteInput,
  onNoteDraftChange,
  onSaveNote,
  onShareQuote,
}: AnnotationSelectionMenuProps) {
  return (
    <div className="p-4 rounded-2xl bg-[#EFE8DA] border-2 border-[#B85D3B] shadow-xl space-y-3 animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B85D3B]">
            <Quote className="w-3.5 h-3.5" />
            <span>Seçilen Metin • Sepya Alıntı &amp; Kenar Notu Menüsü</span>
          </div>
          <p className="font-serif italic text-sm text-[#2C2520] border-l-2 border-[#B85D3B] pl-3 line-clamp-3">
            &ldquo;{selection.text}&rdquo;
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-semibold text-muted hover:text-foreground shrink-0"
        >
          Kapat
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onHighlight}
          className="px-3.5 py-2 rounded-xl bg-[#E6D2B5] hover:bg-[#B85D3B] text-[#2C2520] hover:text-[#F6F1E7] border border-[#B85D3B]/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span>Altını Çiz</span>
        </button>

        <button
          type="button"
          onClick={onToggleNoteInput}
          className="px-3.5 py-2 rounded-xl bg-background hover:bg-[#5C6B57] text-[#2C2520] hover:text-[#F6F1E7] border border-border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>Kenar Notu / Yorum Ekle</span>
        </button>

        <button
          type="button"
          onClick={onShareQuote}
          className="px-3.5 py-2 rounded-xl bg-[#B85D3B] hover:bg-[#A14D2E] text-[#F6F1E7] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Alıntı Kartı Paylaş (Okur Salonu)</span>
        </button>
      </div>

      {selection.showNoteInput && (
        <form
          onSubmit={onSaveNote}
          className="pt-2 flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={selection.noteDraft}
            onChange={(e) => onNoteDraftChange(e.target.value)}
            placeholder="Bu cümle hakkındaki kenar notunuzu veya yorumunuzu yazın..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#B85D3B]"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#5C6B57] text-[#F6F1E7] text-xs font-bold shrink-0"
          >
            Kenar Notunu Kaydet
          </button>
        </form>
      )}
    </div>
  );
}
