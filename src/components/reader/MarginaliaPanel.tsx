import React from "react";
import { Eye, Heart, Highlighter, Plus, StickyNote } from "lucide-react";
import type { CommunityStatus } from "@/store/useCommunityStore";
import type { BookNote } from "@/types";

interface MarginaliaPanelProps {
  items: BookNote[];
  status: CommunityStatus;
  currentWordIndex: number;
  currentWpm: number;
  newNoteText: string;
  selectedQuote: string;
  onNoteTextChange: (value: string) => void;
  onSubmitNote: (e: React.FormEvent) => void;
  onHide: () => void;
  onJump: (wordIndex: number) => void;
  onToggleLike: (noteId: string) => void;
}

export function MarginaliaPanel({
  items,
  status,
  currentWordIndex,
  currentWpm,
  newNoteText,
  selectedQuote,
  onNoteTextChange,
  onSubmitNote,
  onHide,
  onJump,
  onToggleLike,
}: MarginaliaPanelProps) {
  return (
    <div className="p-5 rounded-3xl bg-surface border border-border space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B85D3B]">
            <Eye className="w-3.5 h-3.5" />
            <span>Marginalia • Kenar Notları</span>
          </div>
          <h3 className="font-serif font-bold text-base text-foreground">
            Topluluk Notları &amp; Altı Çizilenler
          </h3>
        </div>
        <button
          onClick={onHide}
          className="text-xs text-muted hover:text-foreground"
        >
          Gizle
        </button>
      </div>

      {/* Quick Highlight / Note Composer inside Marginalia */}
      <form onSubmit={onSubmitNote} className="space-y-2">
        <textarea
          rows={2}
          value={newNoteText}
          onChange={(e) => onNoteTextChange(e.target.value)}
          placeholder={
            selectedQuote
              ? `"${selectedQuote.slice(0, 45)}..." için kenar notu ekle`
              : "Bu sayfaya (Kelime #" +
                (currentWordIndex + 1) +
                ") ortak kenar notu bırakın..."
          }
          className="w-full rounded-xl bg-background border border-border p-3 text-xs focus:outline-none focus:border-[#B85D3B]"
        />
        <button
          type="submit"
          className="w-full py-2 rounded-xl bg-[#B85D3B] hover:bg-[#A14D2E] text-[#F6F1E7] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Kenar Notu Bırak ({currentWpm} WPM)</span>
        </button>
      </form>

      {/* Marginalia Feed */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="p-4 rounded-2xl bg-background/70 border border-border text-xs text-muted text-center space-y-1">
            {status === "ready" ? (
              <>
                <p className="font-serif italic text-foreground">
                  Bu kitapta ilk kenar notunu siz bırakın!
                </p>
                <p>
                  Okurken herhangi bir cümleyi seçerek altını çizebilir
                  veya yorum ekleyebilirsiniz.
                </p>
              </>
            ) : (
              <>
                <p className="font-serif italic text-foreground">
                  Topluluk notları için giriş gerekli.
                </p>
                <p>
                  {status === "unconfigured"
                    ? "Profil menüsünden Supabase bağlantısını tanımla."
                    : "Supabase hesabınla giriş yaparsan diğer okurların notlarını görür ve kendi notlarını paylaşırsın."}{" "}
                  Notların bu cihazda saklanmaya devam eder.
                </p>
              </>
            )}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-background/90 border border-border space-y-2 hover:border-[#B85D3B]/40 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[#B85D3B]/20 text-[#B85D3B] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {(item.author_name || "O")
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                  <span className="text-xs font-bold truncate">
                    {item.author_name || "OkurLab Okuru"}
                  </span>
                  {item.author_wpm && (
                    <span className="px-1.5 py-0.5 rounded bg-[#5C6B57]/15 text-[#5C6B57] text-[10px] font-bold shrink-0">
                      {item.author_wpm} WPM
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onJump(item.word_index)}
                  className="text-[11px] font-semibold text-[#B85D3B] hover:underline shrink-0"
                >
                  #{item.word_index + 1} &rarr;
                </button>
              </div>

              {item.selected_text && (
                <blockquote className="font-serif italic text-xs text-[#2C2520] bg-[#E6D2B5]/45 border-l-2 border-[#B85D3B] pl-2.5 py-1.5 pr-2 rounded-r-lg">
                  &ldquo;{item.selected_text}&rdquo;
                </blockquote>
              )}

              <p className="text-xs text-foreground/90 leading-relaxed">
                {item.content}
              </p>

              <div className="flex items-center justify-between pt-1 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1">
                  {item.type === "highlight" ? (
                    <>
                      <Highlighter className="w-3 h-3 text-[#B85D3B]" />
                      <span>Popüler Altı Çizili</span>
                    </>
                  ) : (
                    <>
                      <StickyNote className="w-3 h-3 text-[#5C6B57]" />
                      <span>Kenar Notu</span>
                    </>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleLike(item.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-colors ${
                      item.liked_by_me
                        ? "bg-[#B85D3B]/15 border-[#B85D3B] text-foreground"
                        : "bg-surface border-border hover:border-[#B85D3B] text-foreground"
                    }`}
                  >
                    <Heart
                      className="w-3 h-3 text-[#B85D3B]"
                      fill={item.liked_by_me ? "#B85D3B" : "none"}
                    />
                    <span>{item.likes_count ?? 0}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
