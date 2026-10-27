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
  Clock,
  Sparkles,
  StickyNote,
  TrendingUp,
  Play,
  Pause,
  Gauge,
} from "lucide-react";
import { useSupereadStore } from "@/store/useSupereadStore";
import { Book, FontFamily, ReadingMode } from "@/types";
import { parseUploadedBookFile } from "@/lib/fileParser";
import { tokenizeParagraphs } from "@/lib/textUtils";
import { RsvpEngine } from "@/components/drills/RsvpEngine";
import { MagicPacerEngine } from "@/components/drills/MagicPacerEngine";
import { BookComprehensionQuiz } from "@/components/BookComprehensionQuizModal";
import { PiperNeuralAudioBar } from "@/components/PiperNeuralAudioBar";
import { getSupabaseClient, pushStateToSupabase } from "@/lib/supabase";

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
    supabaseUrl,
    supabaseAnonKey,
    updateReaderPrefs,
    updateReadingProgress,
    setLastActiveBookId,
    addBook,
    deleteCustomBook,
    addBookNote,
    deleteBookNote,
    markDailyTaskByType,
    recordExercise,
    recordReadingSession,
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

  // Free Reading ("Serbest Okuma - Doğal WPM Ölçer") live timer & Auto-Ramp state
  const [isFreeReadingActive, setIsFreeReadingActive] = useState<boolean>(true);
  const [freeReadingSeconds, setFreeReadingSeconds] = useState<number>(0);
  const [freeStartWordIndex, setFreeStartWordIndex] = useState<number>(0);
  const [headerRampBanner, setHeaderRampBanner] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [sessionSavedBadge, setSessionSavedBadge] = useState<string | null>(
    null
  );

  // Zen Reading Mode: dims toolbars & menus when Pacer or Audio is actively playing, restores on mouse move / touch
  const [isPacerPlaying, setIsPacerPlaying] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [zenDimmed, setZenDimmed] = useState<boolean>(false);
  const zenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isZenEligible = Boolean(
    activeBookId && (isPacerPlaying || isAudioPlaying)
  );

  useEffect(() => {
    if (!isZenEligible) {
      setZenDimmed(false);
      if (zenTimeoutRef.current) clearTimeout(zenTimeoutRef.current);
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-zen-active");
      }
      return;
    }

    // Start Zen dimming shortly after Pacer or Audio starts
    zenTimeoutRef.current = setTimeout(() => {
      setZenDimmed(true);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-zen-active", "true");
      }
    }, 1200);

    const handleWakeUp = () => {
      setZenDimmed(false);
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-zen-active");
      }
      if (zenTimeoutRef.current) clearTimeout(zenTimeoutRef.current);
      zenTimeoutRef.current = setTimeout(() => {
        setZenDimmed(true);
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-zen-active", "true");
        }
      }, 2600);
    };

    window.addEventListener("mousemove", handleWakeUp, { passive: true });
    window.addEventListener("touchstart", handleWakeUp, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleWakeUp);
      window.removeEventListener("touchstart", handleWakeUp);
      if (zenTimeoutRef.current) clearTimeout(zenTimeoutRef.current);
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-zen-active");
      }
    };
  }, [isZenEligible]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync URL params (?book=...&mode=...)
  useEffect(() => {
    const bookParam = searchParams.get("book");
    const modeParam = searchParams.get("mode") as ReadingMode | null;
    if (bookParam && books.some((b) => b.id === bookParam)) {
      setActiveBookId(bookParam);
      setLastActiveBookId(bookParam);
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

  // Reset free reading baseline when book opens
  useEffect(() => {
    if (activeBook) {
      setFreeStartWordIndex(
        readingProgress[activeBook.id]?.current_word_index ?? 0
      );
      setFreeReadingSeconds(0);
      setIsFreeReadingActive(true);
    }
  }, [activeBookId]);

  // Clear ramp banner after 4.5s
  useEffect(() => {
    if (!headerRampBanner) return;
    const t = setTimeout(() => setHeaderRampBanner(null), 4500);
    return () => clearTimeout(t);
  }, [headerRampBanner]);

  // Clear saved badge after 4s
  useEffect(() => {
    if (!sessionSavedBadge) return;
    const t = setTimeout(() => setSessionSavedBadge(null), 4000);
    return () => clearTimeout(t);
  }, [sessionSavedBadge]);

  // Free Reading ("Serbest Okuma - Doğal WPM Ölçer") timer & 2-minute Auto-Ramp
  useEffect(() => {
    if (!activeBook || readingMode !== "standard" || !isFreeReadingActive) {
      return;
    }
    const timer = setInterval(() => {
      setFreeReadingSeconds((prev) => {
        const nextSec = prev + 1;
        if (
          readerPrefs.autoRampEnabled &&
          nextSec > 0 &&
          nextSec % 120 === 0
        ) {
          const fromWpm = currentWpm;
          const toWpm = Math.min(1000, fromWpm + 10);
          setHeaderRampBanner({ from: fromWpm, to: toWpm });
          updateReadingProgress(
            activeBook.id,
            currentWordIndex,
            "standard",
            toWpm
          );
        }
        return nextSec;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    activeBook,
    readingMode,
    isFreeReadingActive,
    readerPrefs.autoRampEnabled,
    currentWpm,
    currentWordIndex,
  ]);

  // Persist session to Zustand store (LocalStorage) + Supabase Cloud if configured
  const handlePersistReadingSession = (params: {
    wordIndex: number;
    wordsRead: number;
    durationSeconds: number;
    finalWpm: number;
    mode: ReadingMode;
  }) => {
    if (!activeBook) return;
    recordReadingSession({
      bookId: activeBook.id,
      wordIndex: params.wordIndex,
      wordsRead: params.wordsRead,
      durationSeconds: params.durationSeconds,
      finalWpm: params.finalWpm,
      mode: params.mode,
    });
    setSessionSavedBadge(
      `Otomatik Kaydedildi: #${params.wordIndex + 1}. kelime • ${params.finalWpm} WPM`
    );

    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    if (client) {
      const latest = useSupereadStore.getState();
      pushStateToSupabase(client, {
        user: latest.user,
        books: latest.books,
        exerciseLogs: latest.exerciseLogs,
        readingProgress: latest.readingProgress,
      }).catch(() => {});
    }
  };

  const activeBookNotes = useMemo(
    () =>
      activeBook
        ? bookNotes.filter((n) => n.book_id === activeBook.id)
        : [],
    [bookNotes, activeBook]
  );

  const handleOpenBook = (bookId: string, mode?: ReadingMode) => {
    const saved = readingProgress[bookId];
    const targetMode = mode || saved?.reading_mode || "pacer";
    setActiveBookId(bookId);
    setLastActiveBookId(bookId);
    setReadingMode(targetMode);
    markDailyTaskByType("book_reading");
  };

  const handleCloseBook = () => {
    if (activeBook && readingMode === "standard" && freeReadingSeconds >= 3) {
      const progressedWords = Math.max(
        0,
        currentWordIndex - freeStartWordIndex
      );
      const naturalWpm =
        progressedWords >= 15
          ? Math.min(
              950,
              Math.max(
                120,
                Math.round((progressedWords / freeReadingSeconds) * 60)
              )
            )
          : currentWpm;
      handlePersistReadingSession({
        wordIndex: currentWordIndex,
        wordsRead: progressedWords > 0 ? progressedWords : Math.round((currentWpm * freeReadingSeconds) / 60),
        durationSeconds: freeReadingSeconds,
        finalWpm: naturalWpm,
        mode: "standard",
      });
    }
    setActiveBookId(null);
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
        summary: `${file.name} (${parsed.format}) dosyasından dönüştürüldü (${pageInfo}${parsed.paragraphs.length} paragraf, ${parsed.wordCount} kelime). Serbest Okuma, Pacer ve RSVP modlarına hazır.`,
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
    const freeWordsDelta = Math.max(0, currentWordIndex - freeStartWordIndex);
    const liveNaturalWpm =
      freeWordsDelta >= 10 && freeReadingSeconds >= 4
        ? Math.min(
            950,
            Math.max(110, Math.round((freeWordsDelta / freeReadingSeconds) * 60))
          )
        : currentWpm;

    return (
      <div className="space-y-5">
        {/* Smart Reader Sticky Top Toolbar (fades softly in Zen Reading Mode) */}
        <div
          className={`p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-4 transition-opacity duration-500 ${
            zenDimmed ? "opacity-15 hover:opacity-100" : "opacity-100"
          }`}
        >
          {/* Left: Back button & Book Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleCloseBook}
              className="p-2.5 rounded-xl bg-surface-elevated border border-border text-muted hover:text-foreground transition-colors shrink-0"
              title="Kaydet ve Kütüphaneye Dön"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-base sm:text-lg truncate">
                  {activeBook.title}
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#B85D3B]/15 text-[#B85D3B] font-semibold shrink-0">
                  %{pct}
                </span>
              </div>
              <p className="text-xs text-muted truncate">
                {activeBook.author} • {currentWordIndex.toLocaleString("tr-TR")} /{" "}
                {activeBook.word_count.toLocaleString("tr-TR")} kelime •{" "}
                <strong className="text-[#B85D3B]">{currentWpm} WPM</strong>
              </p>
            </div>
          </div>

          {/* Center: 3 Reading Mode Switcher ("Serbest Okuma (Doğal WPM Ölçer)", "Pacer (Odak Bloğu)", "RSVP") */}
          <div className="flex flex-wrap rounded-xl bg-surface-elevated p-1 border border-border">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                readingMode === "standard"
                  ? "bg-[#B85D3B] text-[#F6F1E7] shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Serbest Okuma (Doğal WPM Ölçer)</span>
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                readingMode === "pacer"
                  ? "bg-[#B85D3B] text-[#F6F1E7] shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pacer (Odak Bloğu)</span>
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                readingMode === "rsvp"
                  ? "bg-[#B85D3B] text-[#F6F1E7] shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>RSVP</span>
            </button>
          </div>

          {/* Right: Kademeli İvme (Auto-Ramp) Toggle + Typography + Notes */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Kademeli İvme (Auto-Ramp) Toggle Button */}
            <button
              onClick={() =>
                updateReaderPrefs({
                  autoRampEnabled: !readerPrefs.autoRampEnabled,
                })
              }
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                readerPrefs.autoRampEnabled
                  ? "bg-[#5C6B57]/15 border-[#5C6B57]/40 text-[#5C6B57] shadow-sm"
                  : "bg-surface-elevated border-border text-muted hover:text-foreground"
              }`}
              title="Aktifken her 2 dakikada veya 400 kelimede bir okuma hızı otomatik olarak +10 WPM artar"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Kademeli İvme (Auto-Ramp)</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  readerPrefs.autoRampEnabled
                    ? "bg-[#5C6B57] text-[#F6F1E7]"
                    : "bg-surface text-muted"
                }`}
              >
                {readerPrefs.autoRampEnabled ? "+10 WPM AÇIK" : "KAPALI"}
              </span>
            </button>

            {/* Font Family */}
            <div className="hidden xl:flex rounded-xl bg-surface-elevated p-1 border border-border">
              {(
                [
                  { id: "serif", label: "Literata (Kitap)" },
                  { id: "sans", label: "Sans" },
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
                  ? "bg-[#B85D3B]/15 border-[#B85D3B]/40 text-[#B85D3B]"
                  : "bg-surface-elevated border-border text-foreground"
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notlar ({activeBookNotes.length})</span>
            </button>
          </div>
        </div>

        {/* Live Auto-Ramp Notification or Session Saved Banner */}
        {(headerRampBanner || sessionSavedBadge) && (
          <div className="px-4 py-2.5 rounded-2xl bg-surface border border-[#B85D3B]/35 flex flex-wrap items-center justify-between gap-2 text-xs">
            {headerRampBanner && (
              <span className="font-bold text-[#B85D3B] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#5C6B57]" />
                <span>
                  Hız İvmesi: {headerRampBanner.from} &rarr; {headerRampBanner.to}{" "}
                  WPM (+10 WPM Kademeli Artış Uygulandı)
                </span>
              </span>
            )}
            {sessionSavedBadge && (
              <span className="font-semibold text-[#5C6B57]">
                ✓ {sessionSavedBadge}
              </span>
            )}
          </div>
        )}

        {/* Piper Neural TTS (Offline AI Audio) Engine Bar */}
        <PiperNeuralAudioBar
          bookId={activeBook.id}
          bookTitle={activeBook.title}
          bookAuthor={activeBook.author}
          words={tokenizedActiveBook.words}
          currentWordIndex={currentWordIndex}
          wpm={currentWpm}
          autoRampEnabled={readerPrefs.autoRampEnabled}
          zenDimmed={zenDimmed}
          onPlayingStateChange={(playing) => setIsAudioPlaying(playing)}
          onWordIndexSync={(wordIdx) => {
            updateReadingProgress(
              activeBook.id,
              wordIdx,
              readingMode,
              currentWpm
            );
          }}
          onWpmChange={(newWpm, rampNotice) => {
            if (rampNotice) setHeaderRampBanner(rampNotice);
            updateReadingProgress(
              activeBook.id,
              currentWordIndex,
              readingMode,
              newWpm
            );
          }}
          onSessionSave={({ wordIndex, wordsRead, durationSeconds, finalWpm }) => {
            handlePersistReadingSession({
              wordIndex,
              wordsRead,
              durationSeconds,
              finalWpm,
              mode: readingMode,
            });
          }}
        />

        {/* Main Reader Layout (with collapsible Notes Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className={showNotesPanel ? "lg:col-span-8" : "lg:col-span-12"}>
            {/* MODE A: SERBEST OKUMA (DOĞAL WPM ÖLÇER) */}
            {readingMode === "standard" && (
              <div className="rounded-3xl bg-background border-2 border-border overflow-hidden shadow-lg">
                <div className="h-1.5 w-full bg-surface-elevated">
                  <div
                    className="h-full bg-[#B85D3B] transition-all duration-200"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Natural WPM Meter Control Strip */}
                <div
                  className={`px-6 py-3.5 bg-surface/70 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs transition-opacity duration-500 ${
                    zenDimmed ? "opacity-15 hover:opacity-100" : "opacity-100"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B85D3B]/15 border border-[#B85D3B]/30 text-[#B85D3B] font-bold tabular-nums">
                      <Gauge className="w-3.5 h-3.5 text-[#B85D3B]" />
                      <span>Doğal WPM Ölçer: {liveNaturalWpm} WPM</span>
                    </span>
                    <span className="text-muted tabular-nums">
                      Seans Süresi:{" "}
                      <strong className="text-foreground">
                        {Math.floor(freeReadingSeconds / 60)} dk{" "}
                        {freeReadingSeconds % 60} sn
                      </strong>{" "}
                      • Okunan:{" "}
                      <strong className="text-[#5C6B57]">
                        +{freeWordsDelta} kelime
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isFreeReadingActive) {
                          // Pause & save free reading session
                          setIsFreeReadingActive(false);
                          handlePersistReadingSession({
                            wordIndex: currentWordIndex,
                            wordsRead:
                              freeWordsDelta > 0
                                ? freeWordsDelta
                                : Math.max(
                                    10,
                                    Math.round(
                                      (liveNaturalWpm * freeReadingSeconds) / 60
                                    )
                                  ),
                            durationSeconds: Math.max(1, freeReadingSeconds),
                            finalWpm: liveNaturalWpm,
                            mode: "standard",
                          });
                          setFreeStartWordIndex(currentWordIndex);
                        } else {
                          setIsFreeReadingActive(true);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 border transition-all ${
                        isFreeReadingActive
                          ? "bg-[#B85D3B]/15 border-[#B85D3B]/30 text-[#B85D3B] hover:bg-[#B85D3B]/25"
                          : "bg-[#B85D3B] border-[#B85D3B] text-[#F6F1E7]"
                      }`}
                    >
                      {isFreeReadingActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Duraklat & Kaydet</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Sayacı Sürdür</span>
                        </>
                      )}
                    </button>
                    <span className="text-muted hidden sm:inline">
                      Kayıtlı Konum:{" "}
                      <strong className="text-foreground">
                        #{currentWordIndex + 1}
                      </strong>
                    </span>
                  </div>
                </div>

                <div
                  className={`px-6 py-2.5 bg-surface/40 border-b border-border/60 text-[11px] text-muted flex items-center justify-between transition-opacity duration-500 ${
                    zenDimmed ? "opacity-15 hover:opacity-100" : "opacity-100"
                  }`}
                >
                  <span>
                    İpucu: Okurken ulaştığınız kelimeye tıkladığınızda{" "}
                    <strong className="text-foreground">Doğal WPM hızınız</strong>{" "}
                    ve kaldığınız kelime otomatik hesaplanıp kaydedilir.
                  </span>
                  {readerPrefs.autoRampEnabled && (
                    <button
                      onClick={() => {
                        const from = currentWpm;
                        const to = Math.min(1000, from + 10);
                        setHeaderRampBanner({ from, to });
                        updateReadingProgress(
                          activeBook.id,
                          currentWordIndex,
                          "standard",
                          to
                        );
                      }}
                      className="text-[#5C6B57] hover:underline font-semibold shrink-0 ml-2"
                    >
                      ⚡ +10 WPM İvme Uygula ({currentWpm} &rarr;{" "}
                      {Math.min(1000, currentWpm + 10)})
                    </button>
                  )}
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
                      <p key={pIdx} className="text-foreground">
                        {paraWords.map((token) => {
                          const isBookmarkedWord =
                            token.globalIndex === currentWordIndex;
                          return (
                            <React.Fragment key={token.globalIndex}>
                              <span
                                onClick={() => {
                                  const delta = Math.max(
                                    0,
                                    token.globalIndex - freeStartWordIndex
                                  );
                                  const computedWpm =
                                    delta >= 10 && freeReadingSeconds >= 4
                                      ? Math.min(
                                          950,
                                          Math.max(
                                            110,
                                            Math.round(
                                              (delta / freeReadingSeconds) * 60
                                            )
                                          )
                                        )
                                      : currentWpm;

                                  // Check 400-word Auto-Ramp threshold in free reading
                                  let nextWpm = computedWpm;
                                  if (
                                    readerPrefs.autoRampEnabled &&
                                    delta >= 400
                                  ) {
                                    nextWpm = Math.min(1000, computedWpm + 10);
                                    setHeaderRampBanner({
                                      from: computedWpm,
                                      to: nextWpm,
                                    });
                                  }

                                  handlePersistReadingSession({
                                    wordIndex: token.globalIndex,
                                    wordsRead: delta,
                                    durationSeconds: Math.max(
                                      1,
                                      freeReadingSeconds
                                    ),
                                    finalWpm: nextWpm,
                                    mode: "standard",
                                  });
                                  setFreeStartWordIndex(token.globalIndex);
                                  setFreeReadingSeconds(0);
                                }}
                                className={`cursor-pointer rounded px-1 py-0.5 transition-colors ${
                                  isBookmarkedWord
                                    ? "okurlab-pacer-focus font-medium"
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

            {/* MODE B: PACER (ODAK BLOĞU) READER */}
            {readingMode === "pacer" && (
              <MagicPacerEngine
                paragraphs={activeBook.content}
                initialWordIndex={currentWordIndex}
                initialWpm={currentWpm}
                fontClass={fontClass}
                fontSize={readerPrefs.fontSize}
                lineHeight={readerPrefs.lineHeight}
                autoRampEnabled={readerPrefs.autoRampEnabled}
                zenDimmed={zenDimmed}
                onPlayingStateChange={(playing) => setIsPacerPlaying(playing)}
                onToggleAutoRamp={() =>
                  updateReaderPrefs({
                    autoRampEnabled: !readerPrefs.autoRampEnabled,
                  })
                }
                onWordIndexChange={(idx, wpmVal) => {
                  updateReadingProgress(activeBook.id, idx, "pacer", wpmVal);
                }}
                onSessionSave={({
                  wordIndex,
                  wordsRead,
                  durationSeconds,
                  finalWpm,
                }) => {
                  handlePersistReadingSession({
                    wordIndex,
                    wordsRead,
                    durationSeconds,
                    finalWpm,
                    mode: "pacer",
                  });
                }}
                onFinishSession={({
                  wpm: finishedWpm,
                  durationSeconds,
                  wordsRead,
                }) => {
                  handlePersistReadingSession({
                    wordIndex: totalWords - 1,
                    wordsRead,
                    durationSeconds,
                    finalWpm: finishedWpm,
                    mode: "pacer",
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
                autoRampEnabled={readerPrefs.autoRampEnabled}
                onToggleAutoRamp={() =>
                  updateReaderPrefs({
                    autoRampEnabled: !readerPrefs.autoRampEnabled,
                  })
                }
                onWordIndexChange={(idx, wpmVal) => {
                  updateReadingProgress(activeBook.id, idx, "rsvp", wpmVal);
                }}
                onSessionSave={({
                  wordIndex,
                  wordsRead,
                  durationSeconds,
                  finalWpm,
                }) => {
                  handlePersistReadingSession({
                    wordIndex,
                    wordsRead,
                    durationSeconds,
                    finalWpm,
                    mode: "rsvp",
                  });
                }}
                onFinishSession={({
                  wpm: finishedWpm,
                  durationSeconds,
                  wordsRead,
                }) => {
                  handlePersistReadingSession({
                    wordIndex: totalWords - 1,
                    wordsRead,
                    durationSeconds,
                    finalWpm: finishedWpm,
                    mode: "rsvp",
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
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B85D3B] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OkurLab • Kitaplığım &amp; Kademeli Hız (Auto-Ramp) Okuyucu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Kitaplığım &amp; PDF Kütüphanesi
          </h1>
          <p className="text-sm text-muted mt-1">
            Kütüphanedeki eserleri veya kendi yüklediğiniz{" "}
            <strong className="text-foreground">PDF, EPUB, TXT, Markdown</strong>{" "}
            kitaplarını Serbest Okuma (Doğal WPM Ölçer), Pacer (Odak Bloğu) veya RSVP modlarında okuyun.
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
                    <span>Serbest Okuma</span>
                  </button>

                  <button
                    onClick={() => handleOpenBook(book.id, "pacer")}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pacer (Odak)</span>
                  </button>

                  <button
                    onClick={() => handleOpenBook(book.id, "rsvp")}
                    className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>RSVP</span>
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
