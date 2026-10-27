"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Upload,
  Zap,
  Eye,
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  StickyNote,
  TrendingUp,
  Play,
  Pause,
  Gauge,
  Copy,
  Check,
  Compass,
  KeyRound,
} from "lucide-react";
import { useOkurLabStore } from "@/store/useOkurLabStore";
import { ActionResult, useCommunityStore } from "@/store/useCommunityStore";
import { AnnotationSelectionMenu } from "@/components/reader/AnnotationSelectionMenu";
import { MarginaliaPanel } from "@/components/reader/MarginaliaPanel";
import { PersonalNotesPanel } from "@/components/reader/PersonalNotesPanel";
import { BookUploadPanel } from "@/components/library/BookUploadPanel";
import { VISIBILITY_OPTIONS } from "@/components/library/visibilityOptions";
import { Book, BookVisibility, FontFamily, ReadingMode } from "@/types";
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
    communityBooks,
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
    updateBookVisibility,
    importBookByInviteOrCommunity,
    addBookNote,
    deleteBookNote,
    markDailyTaskByType,
    recordReadingSession,
  } = useOkurLabStore();
  const {
    status: communityStatus,
    marginalia,
    loadMarginalia,
    pushAnnotation,
    removeAnnotation,
    toggleLike: toggleCommunityLike,
    publishQuote,
  } = useCommunityStore();

  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>("standard");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");
  const [catalogTab, setCatalogTab] = useState<"my_books" | "discover">(
    "my_books"
  );

  // Upload & Visibility state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadVisibility, setUploadVisibility] =
    useState<BookVisibility>("private");
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Invite Code / Link Importer state
  const [inviteCodeInput, setInviteCodeInput] = useState<string>("");
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // Smart Reader Marginalia & Notes state
  const [showCommunityMarginalia, setShowCommunityMarginalia] =
    useState<boolean>(true);
  const [showNotesPanel, setShowNotesPanel] = useState<boolean>(false);
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [selectedQuote, setSelectedQuote] = useState<string>("");

  // Floating Sepia Annotation Popover state (when user selects text in reader)
  const [selectionMenu, setSelectionMenu] = useState<{
    text: string;
    wordIndex: number;
    showNoteInput: boolean;
    noteDraft: string;
  } | null>(null);
  const [annotationToast, setAnnotationToast] = useState<string | null>(null);

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

  // Sync URL params (?book=...&mode=...&invite=...)
  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    if (inviteParam) {
      const imported = importBookByInviteOrCommunity(inviteParam);
      if (imported.ok && imported.book) {
        setInviteFeedback({
          type: "ok",
          msg: imported.message,
        });
        setActiveBookId(imported.book.id);
        setLastActiveBookId(imported.book.id);
        return;
      }
    }

    const bookParam = searchParams.get("book");
    const modeParam = searchParams.get("mode") as ReadingMode | null;
    if (bookParam) {
      const existsInMyBooks = books.some((b) => b.id === bookParam);
      if (existsInMyBooks) {
        setActiveBookId(bookParam);
        setLastActiveBookId(bookParam);
      } else {
        const imported = importBookByInviteOrCommunity(bookParam);
        if (imported.ok && imported.book) {
          setActiveBookId(imported.book.id);
          setLastActiveBookId(imported.book.id);
        }
      }
      if (modeParam && ["standard", "rsvp", "pacer"].includes(modeParam)) {
        setReadingMode(modeParam);
      } else {
        const saved = readingProgress[bookParam]?.reading_mode;
        if (saved) setReadingMode(saved);
      }
    }
  }, [searchParams]);

  const activeBook: Book | undefined = useMemo(
    () =>
      books.find((b) => b.id === activeBookId) ||
      communityBooks.find((b) => b.id === activeBookId),
    [books, communityBooks, activeBookId]
  );

  // Combined public community books for "Keşfet (Topluluk Kütüphanesi)"
  const discoverBooks = useMemo(() => {
    const map = new Map<string, Book>();
    communityBooks.forEach((b) => map.set(b.id, b));
    books
      .filter((b) => b.visibility === "public")
      .forEach((b) => map.set(b.id, b));
    return Array.from(map.values());
  }, [communityBooks, books]);

  const categories = useMemo(() => {
    const set = new Set<string>(["Tümü"]);
    const source = catalogTab === "my_books" ? books : discoverBooks;
    source.forEach((b) => set.add(b.category));
    return Array.from(set);
  }, [books, discoverBooks, catalogTab]);

  const filteredBooks = useMemo(() => {
    const source = catalogTab === "my_books" ? books : discoverBooks;
    if (selectedCategory === "Tümü") return source;
    return source.filter((b) => b.category === selectedCategory);
  }, [books, discoverBooks, selectedCategory, catalogTab]);

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
    currentProgress?.preferred_wpm ?? readerPrefs.defaultWpm;

  const activeStandardWordRef = useRef<HTMLSpanElement | null>(null);
  const lastStandardLineOffsetRef = useRef<number>(-1);

  const centerActiveWordOnScreen = () => {
    if (typeof window === "undefined") return;
    if (readingMode === "standard" && activeStandardWordRef.current) {
      const rect = activeStandardWordRef.current.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - window.innerHeight * 0.38;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    } else {
      const focused = document.querySelector(".okurlab-pacer-focus");
      if (focused) {
        focused.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // Smoothly auto-scroll the page in Standard (Serbest Okuma) mode during Audio playback
  useEffect(() => {
    if (
      !activeBook ||
      readingMode !== "standard" ||
      !isAudioPlaying ||
      !activeStandardWordRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    const el = activeStandardWordRef.current;
    const lineTop = el.offsetTop;
    const lineChanged = Math.abs(lineTop - lastStandardLineOffsetRef.current) > 8;
    if (!lineChanged) return;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // Keep the spoken sentence comfortably around 32%..52% from the top of the screen
    if (rect.top < vh * 0.25 || rect.top > vh * 0.52) {
      lastStandardLineOffsetRef.current = lineTop;
      const targetWindowY = window.scrollY + rect.top - vh * 0.36;
      window.scrollTo({
        top: Math.max(0, targetWindowY),
        behavior: "smooth",
      });
    }
  }, [currentWordIndex, readingMode, isAudioPlaying, activeBook]);

  // Reset free reading baseline when book opens
  useEffect(() => {
    if (activeBook) {
      setFreeStartWordIndex(
        readingProgress[activeBook.id]?.current_word_index ?? 0
      );
      setFreeReadingSeconds(0);
      setIsFreeReadingActive(true);
      setSelectionMenu(null);
      lastStandardLineOffsetRef.current = -1;
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

  // Clear annotation toast after 4.5s
  useEffect(() => {
    if (!annotationToast) return;
    const t = setTimeout(() => setAnnotationToast(null), 4500);
    return () => clearTimeout(t);
  }, [annotationToast]);

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
      const latest = useOkurLabStore.getState();
      pushStateToSupabase(client, {
        user: latest.user,
        books: latest.books,
        exerciseLogs: latest.exerciseLogs,
        readingProgress: latest.readingProgress,
        bookNotes: latest.bookNotes,
      }).catch(() => {});
    }
  };

  // Personal notes for this book
  const activeBookNotes = useMemo(
    () =>
      activeBook ? bookNotes.filter((n) => n.book_id === activeBook.id) : [],
    [bookNotes, activeBook]
  );

  // Community Marginalia (both community notes & public highlights for this book)
  const activeBookMarginalia = useMemo(
    () => (activeBook ? marginalia[activeBook.id] || [] : []),
    [marginalia, activeBook]
  );

  // Kitap açıldığında (ve oturum durumu değiştiğinde) kitabın herkese açık notlarını çek
  const activeBookIdForNotes = activeBook?.id;
  useEffect(() => {
    if (activeBookIdForNotes) loadMarginalia(activeBookIdForNotes);
  }, [activeBookIdForNotes, loadMarginalia, user.id]);

  // Toplulukla ilgili bir işlemin sonucunu okura anlatır
  const communityToast = (result: ActionResult, successText: string) => {
    if (result.ok) {
      setAnnotationToast(successText);
    } else if (result.reason === "error") {
      setAnnotationToast(`Buluta yazılamadı (not bu cihazda saklandı): ${result.message}`);
    } else {
      setAnnotationToast(
        "Not bu cihazda saklandı. Toplulukla paylaşmak için Supabase hesabınla giriş yap."
      );
    }
  };

  // Set of highlighted quotes in this book for visual underlining
  const highlightedSnippets = useMemo(() => {
    const snippets: string[] = [];
    activeBookNotes.forEach((n) => {
      if (n.selected_text) snippets.push(n.selected_text.toLowerCase());
    });
    activeBookMarginalia.forEach((n) => {
      if (n.selected_text) snippets.push(n.selected_text.toLowerCase());
    });
    return snippets;
  }, [activeBookNotes, activeBookMarginalia]);

  const handleOpenBook = (bookId: string, mode?: ReadingMode) => {
    // Ensure book is in user's library if opened from Discover tab
    if (!books.some((b) => b.id === bookId)) {
      importBookByInviteOrCommunity(bookId);
    }
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
        wordsRead:
          progressedWords > 0
            ? progressedWords
            : Math.round((currentWpm * freeReadingSeconds) / 60),
        durationSeconds: freeReadingSeconds,
        finalWpm: naturalWpm,
        mode: "standard",
      });
    }
    setActiveBookId(null);
  };

  // Handle PDF / EPUB / TXT / MD File Processing with chosen Visibility
  const processUploadedFile = async (file: File) => {
    setIsParsingFile(true);
    setParsingStatus("Dosya okunuyor...");
    setUploadError(null);

    try {
      const parsed = await parseUploadedBookFile(file, (status) => {
        setParsingStatus(status);
      });
      const pageInfo = parsed.pageCount ? `${parsed.pageCount} sayfa, ` : "";
      const generatedShareCode = `OKUR-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

      const newBook: Book = {
        id: `book-custom-${Date.now()}`,
        title: parsed.title,
        author: parsed.author,
        category: `${parsed.format} Kitaplığı`,
        difficulty_level: "Orta",
        word_count: parsed.wordCount,
        cover_gradient:
          parsed.format === "PDF"
            ? "from-[#B85D3B] via-[#8C4327] to-[#2C2520]"
            : "from-[#5C6B57] via-[#4A5D4E] to-[#2C2520]",
        summary: `${file.name} (${parsed.format}) dosyasından dönüştürüldü (${pageInfo}${parsed.paragraphs.length} paragraf, ${parsed.wordCount} kelime). Serbest Okuma, Pacer ve RSVP modlarına hazır.`,
        content: parsed.paragraphs,
        is_custom: true,
        visibility: uploadVisibility,
        share_code: generatedShareCode,
        owner_id: user.id,
        owner_name: user.name,
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

  // Invite Code / Link submission
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = inviteCodeInput.trim();
    if (!raw) return;

    // Extract ?invite=CODE if full URL was pasted
    let code = raw;
    try {
      if (raw.includes("invite=")) {
        const u = new URL(raw);
        code = u.searchParams.get("invite") || raw;
      }
    } catch {
      // keep raw
    }

    const imported = importBookByInviteOrCommunity(code);
    if (imported.ok && imported.book) {
      setInviteFeedback({
        type: "ok",
        msg: imported.message,
      });
      setInviteCodeInput("");
      setCatalogTab("my_books");
    } else {
      setInviteFeedback({
        type: "err",
        msg:
          imported.message ||
          "Bu davet koduna ait kitap bulunamadı. Örnek kodlar: OKUR-KAFKA, OKUR-ZWEIG, OKUR-MONTAIGNE",
      });
    }
  };

  const handleCopyInviteLink = (book: Book) => {
    const code =
      book.share_code ||
      `OKUR-${book.id.replace(/[^a-zA-Z0-9]/g, "").slice(-5).toUpperCase()}`;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://ocula-read.vercel.app";
    const shareUrl = `${origin}/library?invite=${code}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedShareId(book.id);
    setTimeout(() => setCopiedShareId(null), 2500);
  };

  // Detect text selection inside the Smart Reader for the Sepia Annotation Menu
  const handleReaderTextSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";
    if (text && text.length >= 6 && text.length <= 600) {
      setSelectionMenu({
        text,
        wordIndex: currentWordIndex,
        showNoteInput: false,
        noteDraft: "",
      });
      setSelectedQuote(text);
    }
  };

  const closeSelectionMenu = () => {
    setSelectionMenu(null);
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleQuickHighlight = async () => {
    if (!activeBook || !selectionMenu) return;
    const note = addBookNote({
      book_id: activeBook.id,
      word_index: selectionMenu.wordIndex,
      selected_text: selectionMenu.text,
      content: "Altı çizili favori cümle.",
      type: "highlight",
      is_public: true,
    });
    closeSelectionMenu();
    communityToast(
      await pushAnnotation(note),
      "Cümlenin altı çizildi ve Topluluk Notları (Marginalia) panosuna kaydedildi."
    );
  };

  const handleSaveSelectionNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook || !selectionMenu) return;
    const note = addBookNote({
      book_id: activeBook.id,
      word_index: selectionMenu.wordIndex,
      selected_text: selectionMenu.text,
      content:
        selectionMenu.noteDraft.trim() || "Kenar notu ve okuma düşüncesi.",
      type: "note",
      is_public: true,
    });
    setShowCommunityMarginalia(true);
    closeSelectionMenu();
    communityToast(
      await pushAnnotation(note),
      "Kenar notunuz eklendi ve sağdaki Topluluk Notları (Marginalia) sütununda paylaşıldı."
    );
  };

  const handleShareQuoteCardToCommunity = async () => {
    if (!activeBook || !selectionMenu) return;
    const noteBody =
      selectionMenu.noteDraft.trim() ||
      `${activeBook.title} okumasından (${currentWpm} WPM) altı çizili alıntı.`;

    const note = addBookNote({
      book_id: activeBook.id,
      word_index: selectionMenu.wordIndex,
      selected_text: selectionMenu.text,
      content: noteBody,
      type: "highlight",
      is_public: true,
    });
    const quote = {
      book_id: activeBook.id,
      book_title: activeBook.title,
      book_author: activeBook.author,
      quote_text: selectionMenu.text,
      note_comment: noteBody,
      word_index: selectionMenu.wordIndex,
    };
    closeSelectionMenu();

    const noteResult = await pushAnnotation(note);
    const quoteResult = noteResult.ok ? await publishQuote(quote) : noteResult;
    communityToast(
      quoteResult,
      "Alıntı Kartı 'Okur Salonu' (/community) sosyal akışında paylaşıldı!"
    );
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook || !newNoteText.trim()) return;
    const note = addBookNote({
      book_id: activeBook.id,
      word_index: currentWordIndex,
      selected_text:
        selectedQuote ||
        tokenizedActiveBook.words
          .slice(currentWordIndex, currentWordIndex + 8)
          .map((w) => w.word)
          .join(" "),
      content: newNoteText.trim(),
      type: "note",
      is_public: true,
    });
    setNewNoteText("");
    setSelectedQuote("");
    communityToast(await pushAnnotation(note), "Kenar notunuz kaydedildi.");
  };

  const handleDeleteNote = (noteId: string) => {
    const note = bookNotes.find((n) => n.id === noteId);
    deleteBookNote(noteId);
    if (note) removeAnnotation(note);
  };

  const handleToggleMarginaliaLike = async (noteId: string) => {
    if (!activeBook) return;
    const result = await toggleCommunityLike("annotation", noteId, activeBook.id);
    if (!result.ok) {
      setAnnotationToast(
        result.reason === "error"
          ? `Beğeni kaydedilemedi: ${result.message}`
          : "Beğenmek için Supabase hesabınla giriş yapmalısın."
      );
    }
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

    const isSidePanelOpen = showCommunityMarginalia || showNotesPanel;

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
              <span>Serbest Okuma</span>
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

          {/* Right: Kademeli İvme (Auto-Ramp) Toggle + Topluluk Notları (Göz İkonu) + Typography + Notes */}
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
              <span className="hidden sm:inline">Kademeli İvme</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  readerPrefs.autoRampEnabled
                    ? "bg-[#5C6B57] text-[#F6F1E7]"
                    : "bg-surface text-muted"
                }`}
              >
                {readerPrefs.autoRampEnabled ? "+10 WPM" : "KAPALI"}
              </span>
            </button>

            {/* Topluluk Notları (Göz İkonu - Marginalia Toggle) */}
            <button
              onClick={() =>
                setShowCommunityMarginalia((prev) => !prev)
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                showCommunityMarginalia
                  ? "bg-[#B85D3B] text-[#F6F1E7] border-[#B85D3B] shadow-sm"
                  : "bg-surface-elevated border-border text-foreground hover:border-[#B85D3B]/40"
              }`}
              title="Aynı kitabı okuyan diğer okurların bıraktığı kenar notlarını ve en çok altı çizilen cümleleri sağ kenarda (Marginalia) göster"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Topluluk Notları ({activeBookMarginalia.length})</span>
            </button>

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

            {/* Personal Notes Drawer Button */}
            <button
              onClick={() => setShowNotesPanel((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                showNotesPanel
                  ? "bg-[#B85D3B]/15 border-[#B85D3B]/40 text-[#B85D3B]"
                  : "bg-surface-elevated border-border text-foreground"
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notlarım ({activeBookNotes.length})</span>
            </button>
          </div>
        </div>

        {/* Live Auto-Ramp Notification, Session Saved or Annotation Toast Banner */}
        {(headerRampBanner || sessionSavedBadge || annotationToast) && (
          <div className="px-4 py-2.5 rounded-2xl bg-surface border border-[#B85D3B]/35 flex flex-wrap items-center justify-between gap-2 text-xs">
            {headerRampBanner && (
              <span className="font-bold text-[#B85D3B] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#5C6B57]" />
                <span>
                  Hız İvmesi: {headerRampBanner.from} &rarr;{" "}
                  {headerRampBanner.to} WPM (+10 WPM Kademeli Artış Uygulandı)
                </span>
              </span>
            )}
            {sessionSavedBadge && (
              <span className="font-semibold text-[#5C6B57]">
                ✓ {sessionSavedBadge}
              </span>
            )}
            {annotationToast && (
              <div className="flex items-center gap-3 font-semibold text-[#2C2520]">
                <span className="text-[#B85D3B]">✦ {annotationToast}</span>
                <Link
                  href="/community"
                  className="underline text-[#5C6B57] hover:text-[#B85D3B] font-bold"
                >
                  Okur Salonu&apos;nda Gör &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Floating Sepia Annotation Popover Menu (when user selects a sentence/word block) */}
        {selectionMenu && (
          <AnnotationSelectionMenu
            selection={selectionMenu}
            onClose={() => setSelectionMenu(null)}
            onHighlight={handleQuickHighlight}
            onToggleNoteInput={() =>
              setSelectionMenu((prev) =>
                prev ? { ...prev, showNoteInput: !prev.showNoteInput } : null
              )
            }
            onNoteDraftChange={(value) =>
              setSelectionMenu((prev) => (prev ? { ...prev, noteDraft: value } : null))
            }
            onSaveNote={handleSaveSelectionNote}
            onShareQuote={handleShareQuoteCardToCommunity}
          />
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
          onCenterActiveWord={centerActiveWordOnScreen}
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

        {/* Main Reader Layout (with Right-Side Marginalia & Personal Notes Panel) */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          onMouseUp={handleReaderTextSelection}
          onTouchEnd={handleReaderTextSelection}
        >
          <div className={isSidePanelOpen ? "lg:col-span-8" : "lg:col-span-12"}>
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
                          <span>Duraklat &amp; Kaydet</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Sayacı Sürdür</span>
                        </>
                      )}
                    </button>
                    <span className="text-muted hidden sm:inline">
                      Konum:{" "}
                      <strong className="text-foreground">
                        #{currentWordIndex + 1}
                      </strong>
                    </span>
                  </div>
                </div>

                <div
                  className={`px-6 py-2.5 bg-surface/40 border-b border-border/60 text-[11px] text-muted flex flex-wrap items-center justify-between gap-2 transition-opacity duration-500 ${
                    zenDimmed ? "opacity-15 hover:opacity-100" : "opacity-100"
                  }`}
                >
                  <span>
                    İpucu: Herhangi bir cümleyi fareyle seçerek{" "}
                    <strong className="text-[#B85D3B]">
                      Altını Çizebilir, Kenar Notu Ekleyebilir veya Alıntı Kartı
                      Paylaşabilirsiniz
                    </strong>
                    .
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
                      className="text-[#5C6B57] hover:underline font-semibold shrink-0"
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
                    (paraWords, pIdx) => {
                      const paraPlain = activeBook.content[pIdx] || "";
                      const hasCommunityHighlight = highlightedSnippets.some(
                        (s) =>
                          s.length > 10 &&
                          paraPlain.toLowerCase().includes(s.slice(0, 28))
                      );
                      const isActiveAudioParagraph =
                        isAudioPlaying &&
                        paraWords.some(
                          (t) => t.globalIndex === currentWordIndex
                        );

                      return (
                        <p
                          key={pIdx}
                          className={`text-foreground transition-all rounded-2xl ${
                            isActiveAudioParagraph
                              ? "bg-surface/65 border border-[#B85D3B]/35 p-4 -mx-4 shadow-sm"
                              : hasCommunityHighlight
                              ? "border-l-2 border-[#B85D3B]/60 pl-3 bg-[#E6D2B5]/25 rounded-r-xl py-1"
                              : ""
                          }`}
                        >
                          {paraWords.map((token) => {
                            const isBookmarkedWord =
                              token.globalIndex === currentWordIndex;
                            const isAudioFocusSpan =
                              isAudioPlaying &&
                              token.globalIndex >= currentWordIndex &&
                              token.globalIndex < currentWordIndex + 3;

                            return (
                              <React.Fragment key={token.globalIndex}>
                                <span
                                  ref={
                                    isBookmarkedWord
                                      ? activeStandardWordRef
                                      : null
                                  }
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
                                                (delta / freeReadingSeconds) *
                                                  60
                                              )
                                            )
                                          )
                                        : currentWpm;

                                    let nextWpm = computedWpm;
                                    if (
                                      readerPrefs.autoRampEnabled &&
                                      delta >= 400
                                    ) {
                                      nextWpm = Math.min(
                                        1000,
                                        computedWpm + 10
                                      );
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
                                    isBookmarkedWord || isAudioFocusSpan
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
                      );
                    }
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
                externalAudioPlaying={isAudioPlaying}
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

          {/* RIGHT MARGIN: COMMUNITY MARGINALIA & PERSONAL NOTES PANEL */}
          {isSidePanelOpen && (
            <aside className="lg:col-span-4 space-y-5">
              {/* Community Marginalia ("Topluluk Notları & En Çok Altı Çizilenler") */}
              {showCommunityMarginalia && (
                <MarginaliaPanel
                  items={activeBookMarginalia}
                  status={communityStatus}
                  currentWordIndex={currentWordIndex}
                  currentWpm={currentWpm}
                  newNoteText={newNoteText}
                  selectedQuote={selectedQuote}
                  onNoteTextChange={setNewNoteText}
                  onSubmitNote={handleAddNote}
                  onHide={() => setShowCommunityMarginalia(false)}
                  onJump={(wordIndex) =>
                    updateReadingProgress(activeBook.id, wordIndex, readingMode, currentWpm)
                  }
                  onToggleLike={handleToggleMarginaliaLike}
                />
              )}

              {/* Personal Notes Drawer */}
              {showNotesPanel && (
                <PersonalNotesPanel
                  notes={activeBookNotes}
                  currentWordIndex={currentWordIndex}
                  onJump={(wordIndex) =>
                    updateReadingProgress(activeBook.id, wordIndex, readingMode, currentWpm)
                  }
                  onDelete={handleDeleteNote}
                />
              )}
            </aside>
          )}
        </div>

        {/* AI Reading Comprehension Quiz for Any Book */}
        <BookComprehensionQuiz book={activeBook} currentWpm={currentWpm} />
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: E-BOOK LIBRARY CATALOG, SHARING & COMMUNITY DISCOVERY
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Header & PDF/EPUB Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B85D3B] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              OkurLab • Ortak Kütüphane, Kitap Paylaşımı &amp; Auto-Ramp Okuyucu
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Kitaplığım &amp; Ortak Kütüphane
          </h1>
          <p className="text-sm text-muted mt-1">
            Yüklediğiniz{" "}
            <strong className="text-foreground">PDF, EPUB, TXT</strong>{" "}
            kitaplarını{" "}
            <strong className="text-foreground">Sadece Ben</strong>,{" "}
            <strong className="text-[#B85D3B]">
              Arkadaşlarla Paylaş (Davet Linki)
            </strong>{" "}
            veya{" "}
            <strong className="text-[#5C6B57]">
              Topluluk Kütüphanesi (Herkese Açık)
            </strong>{" "}
            olarak yönetin.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal((v) => !v)}
          className="px-5 py-3 rounded-2xl bg-[#B85D3B] hover:bg-[#A14D2E] text-[#F6F1E7] text-sm font-semibold flex items-center gap-2 shadow-md shadow-[#B85D3B]/20 transition-all shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>PDF / EPUB / TXT Kitap Yükle</span>
        </button>
      </div>

      {/* Tabs: "Kitaplığım" vs "Keşfet (Topluluk Kütüphanesi)" + Invite Code Bar */}
      <div className="p-4 rounded-3xl bg-surface border border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex rounded-2xl bg-background p-1 border border-border self-start">
          <button
            onClick={() => {
              setCatalogTab("my_books");
              setSelectedCategory("Tümü");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              catalogTab === "my_books"
                ? "bg-[#B85D3B] text-[#F6F1E7] shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kitaplığım ({books.length})</span>
          </button>

          <button
            onClick={() => {
              setCatalogTab("discover");
              setSelectedCategory("Tümü");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              catalogTab === "discover"
                ? "bg-[#5C6B57] text-[#F6F1E7] shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Keşfet • Topluluk Kütüphanesi ({discoverBooks.length})</span>
          </button>
        </div>

        {/* Invite Link / Code Importer */}
        <form
          onSubmit={handleInviteSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl"
        >
          <div className="relative flex-1">
            <KeyRound className="w-3.5 h-3.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              placeholder="Arkadaş davet kodu veya linki yapıştırın (Örn: OKUR-KAFKA)"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#B85D3B]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#5C6B57] hover:bg-[#4A5846] text-[#F6F1E7] text-xs font-bold shrink-0 transition-all"
          >
            Davetle Kitap Ekle
          </button>
        </form>
      </div>

      {inviteFeedback && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            inviteFeedback.type === "ok"
              ? "bg-[#5C6B57]/15 border-[#5C6B57]/40 text-[#5C6B57]"
              : "bg-[#B85D3B]/15 border-[#B85D3B]/40 text-[#B85D3B]"
          }`}
        >
          <span>{inviteFeedback.msg}</span>
          <button
            onClick={() => setInviteFeedback(null)}
            className="text-muted hover:text-foreground ml-4"
          >
            Kapat
          </button>
        </div>
      )}

      {/* File Upload Dropzone Modal with 3 Visibility Options */}
      {showUploadModal && (
        <BookUploadPanel
          visibility={uploadVisibility}
          onVisibilityChange={setUploadVisibility}
          isDragging={isDragging}
          onDraggingChange={setIsDragging}
          onDrop={handleDrop}
          isParsing={isParsingFile}
          parsingStatus={parsingStatus}
          error={uploadError}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onProcessFile={processUploadedFile}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
              selectedCategory === cat
                ? "bg-[#B85D3B] border-[#B85D3B] text-[#F6F1E7] shadow-sm"
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
          const visibility: BookVisibility =
            book.visibility || (book.is_custom ? "private" : "public");
          const shareCode =
            book.share_code ||
            `OKUR-${book.id
              .replace(/[^a-zA-Z0-9]/g, "")
              .slice(-5)
              .toUpperCase()}`;
          const alreadyInMyLibrary = books.some((b) => b.id === book.id);

          return (
            <div
              key={book.id}
              className="p-6 rounded-3xl bg-surface border border-border hover:border-[#B85D3B]/45 transition-all flex flex-col justify-between gap-5 shadow-sm"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#B85D3B]/15 text-[#B85D3B]">
                        {book.category}
                      </span>
                      <span className="text-[11px] text-muted font-medium">
                        • {book.difficulty_level} Seviye
                      </span>
                      {book.owner_name && (
                        <span className="text-[11px] text-[#5C6B57] font-semibold">
                          • Paylaşan: {book.owner_name}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-serif font-bold leading-snug">
                      {book.title}
                    </h2>
                    <p className="text-xs text-muted">{book.author}</p>
                  </div>

                  {/* Book Cover Badge */}
                  <div
                    className={`w-14 h-20 rounded-2xl bg-gradient-to-br ${book.cover_gradient} flex flex-col items-center justify-center text-[#F6F1E7] shadow-md shrink-0`}
                  >
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  {book.summary}
                </p>

                {/* 3 Visibility Selector Bar on Book Card */}
                {alreadyInMyLibrary && (
                  <div className="p-3 rounded-2xl bg-background/80 border border-border space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        Paylaşım &amp; Görünürlük:
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {VISIBILITY_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = visibility === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                updateBookVisibility(book.id, opt.id)
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                                isSelected
                                  ? "bg-[#B85D3B] text-[#F6F1E7] shadow-sm"
                                  : "bg-surface text-muted hover:text-foreground border border-border"
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{opt.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(visibility === "friends" || visibility === "public") && (
                      <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                        <div className="truncate text-[11px] text-muted">
                          Davet Kodu:{" "}
                          <strong className="font-mono text-foreground">
                            {shareCode}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyInviteLink(book)}
                          className="px-2.5 py-1 rounded-lg bg-[#5C6B57]/15 hover:bg-[#5C6B57] text-[#5C6B57] hover:text-[#F6F1E7] border border-[#5C6B57]/30 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all"
                        >
                          {copiedShareId === book.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Davet Linki Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Davet Linkini Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

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
                      className="h-full bg-[#B85D3B] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 3 Mode Launch Buttons (or Import + Read if in Discover tab) */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                {!alreadyInMyLibrary && (
                  <button
                    onClick={() => {
                      const imported = importBookByInviteOrCommunity(book.id);
                      if (imported.ok) {
                        setInviteFeedback({
                          type: "ok",
                          msg: imported.message,
                        });
                      }
                    }}
                    className="w-full mb-2 py-2 px-3 rounded-xl bg-[#5C6B57] hover:bg-[#4A5846] text-[#F6F1E7] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Kendi OkurLab Kütüphaneme Ekle ({shareCode})</span>
                  </button>
                )}

                <div className="grid grid-cols-3 gap-2 flex-1">
                  <button
                    onClick={() => handleOpenBook(book.id, "standard")}
                    className="py-2.5 px-3 rounded-xl bg-surface-elevated hover:bg-[#B85D3B]/10 border border-border hover:border-[#B85D3B]/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-muted" />
                    <span>Serbest Okuma</span>
                  </button>

                  <button
                    onClick={() => handleOpenBook(book.id, "pacer")}
                    className="py-2.5 px-3 rounded-xl bg-[#B85D3B]/15 hover:bg-[#B85D3B] text-[#B85D3B] hover:text-[#F6F1E7] border border-[#B85D3B]/35 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pacer (Odak)</span>
                  </button>

                  <button
                    onClick={() => handleOpenBook(book.id, "rsvp")}
                    className="py-2.5 px-3 rounded-xl bg-[#5C6B57]/15 hover:bg-[#5C6B57] text-[#5C6B57] hover:text-[#F6F1E7] border border-[#5C6B57]/35 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>RSVP</span>
                  </button>
                </div>

                {book.is_custom && alreadyInMyLibrary && (
                  <button
                    onClick={() => deleteCustomBook(book.id)}
                    className="p-2.5 rounded-xl bg-surface-elevated hover:bg-[#B85D3B]/15 text-muted hover:text-[#B85D3B] border border-border transition-colors"
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
