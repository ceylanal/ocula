import React from "react";
import { Bookmark, Trash2 } from "lucide-react";
import type { BookNote } from "@/types";

interface PersonalNotesPanelProps {
  notes: BookNote[];
  currentWordIndex: number;
  onJump: (wordIndex: number) => void;
  onDelete: (noteId: string) => void;
}

export function PersonalNotesPanel({ notes, currentWordIndex, onJump, onDelete }: PersonalNotesPanelProps) {
  return (
    <div className="p-5 rounded-3xl bg-surface border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-sm flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[#B85D3B]" />
          <span>Kişisel Notlarım &amp; Yer İmleri</span>
        </h3>
        <span className="text-xs text-muted">
          Kelime #{currentWordIndex + 1}
        </span>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {notes.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">
            Henüz kişisel not eklenmedi. Metin seçerek veya yukarıdan
            ekleyebilirsiniz.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-2xl bg-background border border-border space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] text-muted">
                <button
                  onClick={() => onJump(note.word_index)}
                  className="text-[#B85D3B] font-semibold hover:underline"
                >
                  Kelime #{note.word_index + 1} konumuna git &rarr;
                </button>
                <button
                  onClick={() => onDelete(note.id)}
                  className="text-muted hover:text-[#B85D3B]"
                  title="Notu Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {note.selected_text && (
                <div className="font-serif text-[11px] italic text-foreground border-l-2 border-[#B85D3B] pl-2">
                  &ldquo;{note.selected_text}&rdquo;
                </div>
              )}
              <p className="text-xs text-foreground leading-relaxed">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
