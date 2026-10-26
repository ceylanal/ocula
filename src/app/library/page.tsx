"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Upload,
  Zap,
  Eye,
  FileText,
  ArrowLeft,
  Bookmark,
  Plus,
  Trash2,
  Type,
  Clock,
  CheckCircle2,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { useSupereadStore } from "@/store/useSupereadStore";
import { Book, FontFamily, ReadingMode } from "@/types";
import { parseUploadedBookFile } from "@/lib/fileParser";
import { tokenizeParagraphs } from "@/lib/textUtils";
import { RsvpEngine } from "@/components/drills/RsvpEngine";
import { MagicPacerEngine } from "@/components/drills/MagicPacerEngine";
import { BookComprehensionQuiz } from "@/components/BookComprehensionQuizModal";

const FONT_CLASS_MAP: Record<FontFamily, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

function LibraryAndReaderContent() {
  const searchParams = useSearchParams();
  const {
    books,
    user,
    readingProgress,
    bookNotes,
    readerPrefs,
    updateReaderPrefs,
    updateReadingProgress,
    addBook,
    deleteCustomBook,
    addBookNote,
    deleteBookNote,
    markDailyTaskByType,
    recordExercise,
  } = useSupereadStore();

  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>("standard");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Notes drawer state inside Smart Reader
  const [showNotesPanel, setShowNotesPanel] = useState<boolean>(false);
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [selectedQuote, setSelectedQuote] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync URL params (?book=...&mode=...)
  useEffect(() => {
    const bookParam = searchParams.get("book");
    const modeParam = searchParams.get("mode") as ReadingMode | null;
    if (bookParam && books.some((b) => b.id === bookParam)) {
      setActiveBookId(bookParam);
      if (modeParam && ["standard", "rsvp", "pacer"].includes(modeParam)) {
        setReadingMode(modeParam);
      } else {
        const saved = readingProgress[bookParam]?.reading_mode;
        if (saved) setReadingMode(saved);
      }
    }
  }, [searchParams, books]);

  const activeBook: Book | undefined = useMemo(
    () => books.find((b) => b.id === activeBookId),
    [books, activeBookId]
  );

  const categories = useMemo(() => {
    const set = new Set<string>(["Tümü"]);
    books.forEach((b) => set.add(b.category));
    return Array.from(set);
  }, [books]);

  const filteredBooks = useMemo(() => {
    if (selectedCategory === "Tümü") return books;
    return books.filter((b) => b.category === selectedCategory);
  }, [books, selectedCategory]);

  // Tokenize active book for Standard mode word tracking & synchronized switching
  const tokenizedActiveBook = useMemo(() => {
    if (!activeBook) return { words: [], paragraphsOfWords: [] };
    return tokenizeParagraphs(activeBook.content);
  }, [activeBook]);

  const currentProgress = activeBook
    ? readingProgress[activeBook.id]
    : undefined;
  const currentWordIndex = currentProgress?.current_word_index ?? 0;
  const currentWpm =
    currentProgress?.preferred_wpm ?? user.current_wpm ?? readerPrefs.defaultWpm;

  const activeBookNotes = useMemo(
    () =>
      activeBook
        ? bookNotes.filter((n) => n.book_id === activeBook.id)
        : [],
    [bookNotes, activeBook]
  );

  const handleOpenBook = (bookId: string, mode?: ReadingMode) => {
    const saved = readingProgress[bookId];
    const targetMode = mode || saved?.reading_mode || "standard";
    setActiveBookId(bookId);
    setReadingMode(targetMode);
    markDailyTaskByType("book_reading");
  };

  // Handle PDF / EPUB / TXT / MD File Processing
  const processUploadedFile = async (file: File) => {
    setIsParsingFile(true);
    setParsingStatus("Dosya okunuyor...");
    setUploadError(null);

    try {
      const parsed = await parseUploadedBookFile(file, (status) => {
        setParsingStatus(status);
      });
      const pageInfo = parsed.pageCount ? `${parsed.pageCount} sayfa, ` : "";
      const newBook: Book = {
        id: `book-custom-${Date.now()}`,
        title: parsed.title,
        author: parsed.author,
        category: `${parsed.format} Kitaplığı`,
        difficulty_level: "Orta",
        word_count: parsed.wordCount,
        cover_gradient:
          parsed.format === "PDF"
            ? "from-rose-600 via-orange-600 to-amber-700"
            : "from-fuchsia-600 via-purple-600 to-indigo-700",
        summary: `${file.name} (${parsed.format}) dosyasından dönüştürüldü (${pageInfo}${parsed.paragraphs.length} paragraf, ${parsed.wordCount} kelime). Standart, Magic Pacer ve RSVP modlarına hazır.`,
        content: parsed.paragraphs,
        is_custom: true,
      };

      addBook(newBook);
      setShowUploadModal(false);
      setActiveBookId(newBook.id);
      setReadingMode("pacer");
    } catch (err) {
      console.error(err);
      setUploadError(
        "Dosya dönüştürülürken bir hata oluştu. Lütfen geçerli bir .pdf, .epub, .txt veya .md dosyası seçin."
      );
    } finally {
      setIsParsingFile(false);
      setParsingStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook || !newNoteText.trim()) return;
    addBookNote({
      book_id: activeBook.id,
      word_index: currentWordIndex,
      selected_text:
        selectedQuote ||
        tokenizedActiveBook.words
          .slice(currentWordIndex, currentWordIndex + 6)
          .map((w) => w.word)
          .join(" "),
      content: newNoteText.trim(),
    });
    setNewNoteText("");
    setSelectedQuote("");
  };

  // ============================================================================
  // VIEW 1: SMART READER (WHEN A BOOK IS OPEN)
  // ============================================================================
  if (activeBook) {
    const totalWords = Math.max(1, tokenizedActiveBook.words.length);
    const pct = Math.min(100, Math.round((currentWordIndex / totalWords) * 100));
    const fontClass = FONT_CLASS_MAP[readerPrefs.fontFamily];

    return (
      <div className="space-y-5">
        {/* Smart Reader Sticky Top Toolbar */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-4">
          {/* Left: Back button & Book Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setActiveBookId(null)}
              className="p-2.5 rounded-xl bg-surface-elevated border border-border text-muted hover:text-foreground transition-colors shrink-0"
              title="Kütüphaneye Dön"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg truncate">
                  {activeBook.title}
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-semibold shrink-0">
                  %{pct}
                </span>
              </div>
              <p className="text-xs text-muted truncate">
                {activeBook.author} • {activeBook.word_count} kelime • Kelime #
                {currentWordIndex + 1}
              </p>
            </div>
          </div>

          {/* Center: 3 Reading Mode Switcher (Standard / Magic Pacer / RSVP) */}
          <div className="flex rounded-xl bg-surface-elevated p-1 border border-border">
            <button
              onClick={() => {
                setReadingMode("standard");
                updateReadingProgress(
                  activeBook.id,
                  currentWordIndex,
                  "standard",
                  currentWpm
                );
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                readingMode === "standard"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Standart</span>
            </button>

            <button
              onClick={() => {
                setReadingMode("pacer");
                updateReadingProgress(
                  activeBook.id,
                  currentWordIndex,
                  "pacer",
                  currentWpm
                );
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                readingMode === "pacer"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Magic Pacer</span>
            </button>

            <button
              onClick={() => {
                setReadingMode("rsvp");
                updateReadingProgress(
                  activeBook.id,
                  currentWordIndex,
                  "rsvp",
                  currentWpm
                );
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                readingMode === "rsvp"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>RSVP Odak</span>
            </button>
          </div>

          {/* Right: Typography Controls & Notes Toggle */}
          <div className="flex items-center gap-2">
            {/* Font Family */}
            <div className="hidden sm:flex rounded-xl bg-surface-elevated p-1 border border-border">
              {(
                [
                  { id: "sans", label: "Sans" },
                  { id: "serif", label: "Serif" },
                  { id: "mono", label: "Mono" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateReaderPrefs({ fontFamily: f.id })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    readerPrefs.fontFamily === f.id
                      ? "bg-surface text-foreground border border-border"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Font Size A- / A+ */}
            <div className="flex items-center rounded-xl bg-surface-elevated border border-border p-1">
              <button
                onClick={() =>
                  updateReaderPrefs({
                    fontSize: Math.max(15, readerPrefs.fontSize - 2),
                  })
                }
                className="px-2 py-1 text-xs font-bold text-muted hover:text-foreground"
                title="Yazıyı Küçült"
              >
                A-
              </button>
              <span className="text-[11px] text-muted px-1">
                {readerPrefs.fontSize}
              </span>
              <button
                onClick={() =>
                  updateReaderPrefs({
                    fontSize: Math.min(28, readerPrefs.fontSize + 2),
                  })
                }
                className="px-2 py-1 text-xs font-bold text-muted hover:text-foreground"
                title="Yazıyı Büyüt"
              >
                A+
              </button>
            </div>

            {/* Notes Drawer Button */}
            <button
              onClick={() => setShowNotesPanel((v) => !v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                showNotesPanel
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-surface-elevated border-border text-foreground"
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notlar ({activeBookNotes.length})</span>
            </button>
          </div>
        </div>

        {/* Main Reader Layout (with collapsible Notes Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className={showNotesPanel ? "lg:col-span-8" : "lg:col-span-12"}>
            {/* MODE A: STANDARD READER */}
            {readingMode === "standard" && (
              <div className="rounded-3xl bg-surface border-2 border-border overflow-hidden shadow-xl">
                <div className="h-1.5 w-full bg-surface-elevated">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-200"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="px-6 py-3 bg-surface-elevated/50 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    İpucu: Herhangi bir kelimeye tıklayarak yer iminizi o
                    noktaya taşıyabilir ve hemen üstten{" "}
                    <strong className="text-indigo-400">RSVP</strong> veya{" "}
                    <strong className="text-indigo-400">Magic Pacer</strong>{" "}
                    moduna geçebilirsiniz.
                  </span>
                  <span>
                    Kayıtlı Konum:{" "}
                    <strong className="text-foreground">
                      #{currentWordIndex + 1}
                    </strong>
                  </span>
                </div>

                <div
                  className={`p-6 sm:p-12 space-y-6 max-w-3xl mx-auto ${fontClass}`}
                  style={{
                    fontSize: `${readerPrefs.fontSize}px`,
                    lineHeight: readerPrefs.lineHeight,
                  }}
                >
                  {tokenizedActiveBook.paragraphsOfWords.map(
                    (paraWords, pIdx) => (
                      <p key={pIdx} className="text-foreground/95">
                        {paraWords.map((token) => {
                          const isBookmarkedWord =
                            token.globalIndex === currentWordIndex;
                          return (
                            <React.Fragment key={token.globalIndex}>
                              <span
                                onClick={() => {
                                  updateReadingProgress(
                                    activeBook.id,
                                    token.globalIndex,
                                    "standard",
                                    currentWpm
                                  );
                                }}
                                className={`cursor-pointer rounded px-0.5 transition-colors ${
                                  isBookmarkedWord
                                    ? "bg-indigo-500/25 text-indigo-400 font-semibold underline decoration-indigo-500"
                                    : "hover:bg-surface-elevated"
                                }`}
                              >
                                {token.word}
                              </span>{" "}
                            </React.Fragment>
                          );
                        })}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* MODE B: MAGIC PACER READER */}
            {readingMode === "pacer" && (
              <MagicPacerEngine
                paragraphs={activeBook.content}
                initialWordIndex={currentWordIndex}
                initialWpm={currentWpm}
                fontClass={fontClass}
                fontSize={readerPrefs.fontSize}
                lineHeight={readerPrefs.lineHeight}
                onWordIndexChange={(idx, wpmVal) => {
                  updateReadingProgress(activeBook.id, idx, "pacer", wpmVal);
                }}
                onFinishSession={({ wpm: finishedWpm, durationSeconds }) => {
                  recordExercise({
                    exercise_type: "pacer",
                    achieved_wpm: finishedWpm,
                    accuracy_score: 90,
                    duration_seconds: durationSeconds,
                  });
                }}
              />
            )}

            {/* MODE C: RSVP READER */}
            {readingMode === "rsvp" && (
              <RsvpEngine
                paragraphs={activeBook.content}
                initialWordIndex={currentWordIndex}
                initialWpm={currentWpm}
                fontClass={fontClass}
                onWordIndexChange={(idx, wpmVal) => {
                  updateReadingProgress(activeBook.id, idx, "rsvp", wpmVal);
                }}
                onFinishSession={({ wpm: finishedWpm, durationSeconds }) => {
                  recordExercise({
                    exercise_type: "rsvp",
                    achieved_wpm: finishedWpm,
                    accuracy_score: 92,
                    duration_seconds: durationSeconds,
                  });
                }}
              />
            )}
          </div>

          {/* Collapsible Notes & Bookmarks Drawer */}
          {showNotesPanel && (
            <div className="lg:col-span-4 p-5 rounded-3xl bg-surface border border-border space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>Kitap Notları & Yer İmleri</span>
                </h3>
                <span className="text-xs text-muted">
                  Kelime #{currentWordIndex + 1}
                </span>
              </div>

              <form onSubmit={handleAddNote} className="space-y-2.5">
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Mevcut okuma konumuna (#Kelime) düşünce veya özet notu ekleyin..."
                  className="w-full rounded-xl bg-surface-elevated border border-border p-3 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bu Konuma Not Ekle</span>
                </button>
              </form>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {activeBookNotes.length === 0 ? (
                  <p className="text-xs text-muted text-center py-6">
                    Bu kitap için henüz bir not eklenmedi.
                  </p>
                ) : (
                  activeBookNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-surface-elevated border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <button
                          onClick={() =>
                            updateReadingProgress(
                              activeBook.id,
                              note.word_index,
                              readingMode,
                              currentWpm
                            )
                          }
                          className="text-indigo-400 font-semibold hover:underline"
                        >
                          Kelime #{note.word_index + 1} konumuna git →
                        </button>
                        <button
                          onClick={() => deleteBookNote(note.id)}
                          className="text-muted hover:text-rose-400"
                          title="Notu Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {note.selected_text && (
                        <div className="text-[11px] italic text-muted border-l-2 border-indigo-500 pl-2">
                          &quot;{note.selected_text}&quot;
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
          )}
        </div>

        {/* Phase 4: AI Reading Comprehension Quiz for Any Book (Including Uploaded PDF/EPUB) */}
        <BookComprehensionQuiz book={activeBook} currentWpm={currentWpm} />
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: E-BOOK LIBRARY CATALOG & EPUB/TXT/MD IMPORTER
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Header & PDF/EPUB Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Faz 2 • Egzersiz Entegreli Akıllı E-Kitap Kütüphanesi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Smart Reader Kütüphanesi
          </h1>
          <p className="text-sm text-muted mt-1">
            Kütüphanedeki eserleri veya kendi yüklediğiniz{" "}
            <strong className="text-foreground">PDF, EPUB, TXT, Markdown</strong>{" "}
            kitaplarını Standart, Magic Pacer veya RSVP modlarında okuyun.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal((v) => !v)}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>PDF / EPUB / TXT Kitap Yükle</span>
        </button>
      </div>

      {/* File Upload Dropzone Modal */}
      {showUploadModal && (
        <div className="p-6 rounded-3xl bg-surface border-2 border-dashed border-indigo-500/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">
                Kütüphaneye PDF veya E-Kitap Yükle
              </h3>
              <p className="text-xs text-muted">
                PDF sayfaları ve EPUB bölümleri otomatik olarak temiz
                paragraflara ve kelime dizilerine dönüştürülerek RSVP ve Magic
                Pacer motoruna bağlanır.
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(false)}
              className="text-xs text-muted hover:text-foreground"
            >
              Kapat
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex-1 w-full cursor-pointer p-8 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-2.5 ${
                isDragging
                  ? "bg-indigo-500/20 border-indigo-500 scale-[1.01]"
                  : "bg-surface-elevated hover:bg-indigo-500/10 border-border hover:border-indigo-500/40"
              }`}
            >
              <Upload className="w-8 h-8 text-indigo-400" />
              <div className="text-sm font-semibold">
                {isParsingFile
                  ? parsingStatus || "Dosya Dönüştürülüyor..."
                  : ".pdf, .epub, .txt veya .md Dosyası Seçin / Sürükleyin"}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-semibold">
                  PDF
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-semibold">
                  EPUB
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                  TXT / MD
                </span>
                <span>sayfa numaraları ve tirelemeler otomatik temizlenir</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.epub,.txt,.md,.markdown,application/pdf,application/epub+zip,text/plain,text/markdown"
                onChange={handleFileChange}
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
                disabled={isParsingFile}
                onClick={async () => {
                  const res = await fetch("/ornek-hizli-okuma-kitabi.pdf");
                  const blob = await res.blob();
                  const samplePdf = new File(
                    [blob],
                    "ornek-hizli-okuma-kitabi.pdf",
                    { type: "application/pdf" }
                  );
                  await processUploadedFile(samplePdf);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all"
              >
                Örnek PDF Dönüştür (.pdf)
              </button>
              <button
                type="button"
                disabled={isParsingFile}
                onClick={async () => {
                  const res = await fetch("/ornek-kitap.md");
                  const blob = await res.blob();
                  const sampleMd = new File([blob], "ornek-kitap.md", {
                    type: "text/markdown",
                  });
                  await processUploadedFile(sampleMd);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
              >
                Örnek Markdown Dönüştür (.md)
              </button>
            </div>
          </div>

          {uploadError && (
            <p className="text-xs text-rose-400 font-medium">{uploadError}</p>
          )}
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
              selectedCategory === cat
                ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Book Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBooks.map((book) => {
          const prog = readingProgress[book.id];
          const wordIdx = prog?.current_word_index ?? 0;
          const pct = Math.min(
            100,
            Math.round((wordIdx / Math.max(1, book.word_count)) * 100)
          );
          const estMinutes = Math.max(
            1,
            Math.ceil(book.word_count / Math.max(150, user.current_wpm))
          );

          return (
            <div
              key={book.id}
              className="p-6 rounded-3xl bg-surface border border-border hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-5 shadow-sm"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400">
                        {book.category}
                      </span>
                      <span className="text-[11px] text-muted font-medium">
                        • {book.difficulty_level} Seviye
                      </span>
                    </div>
                    <h2 className="text-xl font-bold leading-snug">
                      {book.title}
                    </h2>
                    <p className="text-xs text-muted">{book.author}</p>
                  </div>

                  {/* Book Cover Badge */}
                  <div
                    className={`w-14 h-20 rounded-2xl bg-gradient-to-br ${book.cover_gradient} flex flex-col items-center justify-center text-white shadow-lg shrink-0`}
                  >
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  {book.summary}
                </p>

                {/* Metadata & Progress Bar */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {book.word_count} kelime
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />~{estMinutes} dk (
                        {user.current_wpm} WPM ile)
                      </span>
                    </span>
                    <span className="font-semibold text-foreground">
                      %{pct} Tamamlandı
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 3 Mode Launch Buttons */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <button
                    onClick={() => handleOpenBook(book.id, "standard")}
                    className="py-2.5 px-3 rounded-xl bg-surface-elevated hover:bg-indigo-500/10 border border-border hover:border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-muted" />
                    <span>Standart</span>
                  </button>

                  <button
                    onClick={() => handleOpenBook(book.id, "pacer")}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Magic Pacer</span>
                  </button>

                  <button
                    onClick={() => handleOpenBook(book.id, "rsvp")}
                    className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>RSVP Odak</span>
                  </button>
                </div>

                {book.is_custom && (
                  <button
                    onClick={() => deleteCustomBook(book.id)}
                    className="p-2.5 rounded-xl bg-surface-elevated hover:bg-rose-500/15 text-muted hover:text-rose-400 border border-border transition-colors"
                    title="Kitabı Kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 rounded-3xl bg-surface border border-border animate-pulse" />
      }
    >
      <LibraryAndReaderContent />
    </Suspense>
  );
}
