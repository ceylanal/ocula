"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Flame,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Eye,
  Gauge,
  Clock,
  RotateCcw,
  Sparkles,
  Upload,
  FileText,
  Play,
  Grid3X3,
  Target,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useOkurLabStore } from "@/store/useOkurLabStore";
import { parseUploadedBookFile } from "@/lib/fileParser";
import { Book } from "@/types";

const MODE_LABELS: Record<string, string> = {
  standard: "Serbest Okuma (Doğal WPM)",
  pacer: "Pacer (Odak Bloğu)",
  rsvp: "RSVP Odak",
};

export default function ReadingStudioPage() {
  const router = useRouter();
  const {
    user,
    books,
    lastActiveBookId,
    setLastActiveBookId,
    readingProgress,
    exerciseLogs,
    dailyReadingMinutes,
    dailyReadingGoalMinutes,
    dailyWordsRead,
    dailyWordsGoal,
    readerPrefs,
    updateReaderPrefs,
    addBook,
    resetDemoData,
  } = useOkurLabStore();

  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsingStatus, setParsingStatus] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeBook = useMemo(() => {
    return (
      books.find((b) => b.id === lastActiveBookId) ||
      books[0]
    );
  }, [books, lastActiveBookId]);

  const activeProg = activeBook ? readingProgress[activeBook.id] : undefined;

  // Compute realistic progress display for Active Book card
  const totalBookWords = activeBook ? Math.max(1, activeBook.word_count) : 36000;
  const currentWordIdx = activeProg?.current_word_index ?? 0;

  // If the user hasn't advanced far yet in the default demo book, show actual or meaningful progress
  const progressPct = Math.min(
    100,
    Math.max(
      currentWordIdx > 0 ? 1 : 0,
      Math.round((currentWordIdx / totalBookWords) * 100)
    )
  );
  const bookWpm =
    activeProg?.preferred_wpm ?? readerPrefs.defaultWpm;
  const savedMode = activeProg?.reading_mode ?? "pacer";
  const remainingWords = Math.max(0, totalBookWords - currentWordIdx);
  const estimatedRemainingMinutes = Math.max(
    1,
    Math.ceil(remainingWords / Math.max(120, bookWpm))
  );

  // Last 7 days progressive WPM evolution chart data
  const last7DaysWpmData = useMemo(() => {
    const recent = exerciseLogs.slice(-7);
    const dayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Bugün"];
    return recent.map((log, idx) => ({
      day: log.label || dayLabels[idx] || `Gün ${idx + 1}`,
      wpm: log.achieved_wpm,
      etkiliWpm: Math.round(log.achieved_wpm * (log.accuracy_score / 100)),
      anlama: log.accuracy_score,
    }));
  }, [exerciseLogs]);

  const wpmGain7Days = useMemo(() => {
    if (last7DaysWpmData.length < 2) return 45;
    const first = last7DaysWpmData[0].wpm;
    const last = last7DaysWpmData[last7DaysWpmData.length - 1].wpm;
    return last - first;
  }, [last7DaysWpmData]);

  const handleUploadFile = async (file: File) => {
    setIsParsingFile(true);
    setParsingStatus("PDF / Kitap metne dönüştürülüyor...");
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
            : "from-indigo-600 via-violet-600 to-purple-700",
        summary: `${file.name} (${parsed.format}) dosyasından dönüştürüldü (${pageInfo}${parsed.paragraphs.length} paragraf, ${parsed.wordCount.toLocaleString("tr-TR")} kelime).`,
        content: parsed.paragraphs,
        is_custom: true,
      };

      addBook(newBook);
      router.push(`/library?book=${newBook.id}&mode=pacer`);
    } catch (err) {
      console.error(err);
      setUploadError(
        "Dosya dönüştürülürken hata oluştu. Lütfen geçerli bir .pdf, .epub, .txt veya .md dosyası seçin."
      );
    } finally {
      setIsParsingFile(false);
      setParsingStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-72 rounded-3xl bg-surface border border-border" />
        <div className="h-64 rounded-3xl bg-surface border border-border" />
      </div>
    );
  }

  const minutesPct = Math.min(
    100,
    Math.round((dailyReadingMinutes / Math.max(1, dailyReadingGoalMinutes)) * 100)
  );
  const wordsPct = Math.min(
    100,
    Math.round((dailyWordsRead / Math.max(1, dailyWordsGoal)) * 100)
  );

  return (
    <div className="space-y-7">
      {/* Studio Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B85D3B]/15 border border-[#B85D3B]/30 text-[#B85D3B] text-xs font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#B85D3B]" />
            <span>OkurLab • Sıcak Sepya Kitap Stüdyosu &amp; Kademeli Hızlanma (Progressive WPM)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Okuma Stüdyosu
          </h1>
        </div>

        {/* Active Book Selector Pills (Quick switch between books) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-muted shrink-0">Aktif Kitap:</span>
          {books.slice(0, 4).map((b) => {
            const isSelected = activeBook?.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setLastActiveBookId(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all truncate max-w-[180px] ${
                  isSelected
                    ? "bg-[#B85D3B] border-[#B85D3B] text-[#F6F1E7] shadow-sm"
                    : "bg-surface border-border text-muted hover:text-foreground"
                }`}
              >
                {b.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          ROW 1: ACTIVE BOOK ("OKUMAYA DEVAM ET") + QUICK PDF/EPUB DROPZONE
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT (7 COLS): LARGE "OKUMAYA DEVAM ET (ACTIVE BOOK)" CARD + WARMUP SUGGESTION */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <div className="relative flex-1 rounded-3xl bg-surface border-2 border-border p-6 sm:p-7 overflow-hidden shadow-md flex flex-col justify-between gap-6">
            {/* Subtle Botanical Ambient Ring */}
            <div className="pointer-events-none absolute -right-14 -top-14 w-64 h-64 rounded-full border border-[#B85D3B]/15 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border border-[#5C6B57]/15 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#B85D3B]/10 blur-xl" />
              </div>
            </div>

            {activeBook && (
              <>
                <div className="relative z-10 space-y-4">
                  {/* Top Badge Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#B85D3B]/15 border border-[#B85D3B]/30 text-[#B85D3B] text-[11px] font-bold uppercase tracking-wider">
                        Okumaya Devam Et • Aktif Kitap
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-semibold text-muted">
                        {activeBook.category}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        updateReaderPrefs({
                          autoRampEnabled: !readerPrefs.autoRampEnabled,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-all ${
                        readerPrefs.autoRampEnabled
                          ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                          : "bg-surface-elevated border-border text-muted"
                      }`}
                      title="Okurken her 2 dakikada veya 400 kelimede bir +10 WPM otomatik hız artışı"
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>
                        Auto-Ramp: {readerPrefs.autoRampEnabled ? "+10 WPM AÇIK" : "KAPALI"}
                      </span>
                    </button>
                  </div>

                  {/* Book Title & Author */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
                        {activeBook.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted">
                        {activeBook.author} • Son Mod:{" "}
                        <strong className="text-indigo-400">
                          {MODE_LABELS[savedMode] || "Pacer"}
                        </strong>
                      </p>
                    </div>
                    <div
                      className={`w-14 h-20 rounded-2xl bg-gradient-to-br ${activeBook.cover_gradient} flex items-center justify-center text-white shadow-xl border border-white/15 shrink-0`}
                    >
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Progress Bar: % and Word Count */}
                  <div className="p-4 rounded-2xl bg-surface/85 border border-border space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-muted">
                        Kitap İlerlemesi
                      </span>
                      <span className="font-extrabold text-sm text-foreground tabular-nums">
                        %{progressPct}{" "}
                        <span className="text-muted font-medium">
                          — {currentWordIdx.toLocaleString("tr-TR")} /{" "}
                          {totalBookWords.toLocaleString("tr-TR")} kelime
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${ Math.max(4, progressPct) }%` }}
                      />
                    </div>

                    {/* 3 Telemetry Pills inside Active Book */}
                    <div className="grid grid-cols-3 gap-2 pt-1.5">
                      <div className="p-2.5 rounded-xl bg-surface-elevated/80 border border-border/80">
                        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                          Mevcut Hızın
                        </div>
                        <div className="text-base sm:text-lg font-extrabold text-indigo-400 tabular-nums flex items-baseline gap-1 mt-0.5">
                          {bookWpm}
                          <span className="text-[10px] font-semibold text-muted">
                            WPM
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-elevated/80 border border-border/80">
                        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                          Tahmini Bitiş
                        </div>
                        <div className="text-base sm:text-lg font-extrabold text-emerald-400 tabular-nums flex items-baseline gap-1 mt-0.5">
                          ~{estimatedRemainingMinutes}
                          <span className="text-[10px] font-semibold text-muted">
                            dk
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-elevated/80 border border-border/80">
                        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                          Kademeli İvme
                        </div>
                        <div className="text-base sm:text-lg font-extrabold text-amber-400 tabular-nums flex items-baseline gap-1 mt-0.5">
                          +10
                          <span className="text-[10px] font-semibold text-muted">
                            WPM / 2dk
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary CTA: Kaldığın Yerden Devam Et + Mode Quick Links */}
                <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <Link
                    href={`/library?book=${activeBook.id}&mode=${savedMode}`}
                    className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 transition-all"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Kaldığın Yerden Devam Et</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/library?book=${activeBook.id}&mode=pacer`}
                      className="flex-1 sm:flex-initial py-4 px-3.5 rounded-2xl bg-surface-elevated hover:bg-indigo-500/15 border border-border hover:border-indigo-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      title="Pacer (Odak Bloğu) modunda aç"
                    >
                      <Eye className="w-4 h-4 text-indigo-400" />
                      <span>Pacer</span>
                    </Link>
                    <Link
                      href={`/library?book=${activeBook.id}&mode=rsvp`}
                      className="flex-1 sm:flex-initial py-4 px-3.5 rounded-2xl bg-surface-elevated hover:bg-rose-500/15 border border-border hover:border-rose-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      title="RSVP Odak modunda aç"
                    >
                      <Zap className="w-4 h-4 text-rose-400" />
                      <span>RSVP</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Requirement 4: Pre-Reading Warmup Suggestion directly below Active Book Card */}
          <div className="px-4 py-3 rounded-2xl bg-surface/90 border border-border/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-muted">
              <Grid3X3 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Okuma öncesi göz kaslarını ısıtmak ister misin?
              </span>
            </div>
            <Link
              href="/drills?tab=schulte"
              className="font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>60 sn Schulte Tablosu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* RIGHT (5 COLS): QUICK "YENİ PDF / EPUB / METİN YÜKLE" DROPZONE CARD */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-surface border border-border flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Hızlı Kitap &amp; PDF Dönüştürücü</span>
              </span>
              <Link
                href="/library"
                className="text-xs text-muted hover:text-foreground underline"
              >
                Tüm Kitaplık ({books.length})
              </Link>
            </div>
            <h2 className="text-lg sm:text-xl font-bold">
              Yeni PDF / EPUB / Metin Yükle
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              Yüklediğiniz PDF dosyaları <code className="text-indigo-300">pdfjs-dist</code>{" "}
              motoruyla temiz kelime dizilerine dönüştürülür ve Kademeli Hız (Auto-Ramp) okuyucuda açılır.
            </p>
          </div>

          {/* Interactive Dropzone */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) await handleUploadFile(file);
            }}
            className={`flex-1 min-h-[180px] cursor-pointer p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-3 ${
              isDragging
                ? "bg-indigo-500/20 border-indigo-400 scale-[1.01]"
                : "bg-surface-elevated/70 hover:bg-indigo-500/10 border-indigo-500/35 hover:border-indigo-500"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground">
                {isParsingFile
                  ? parsingStatus || "PDF Kelime Dizisine Dönüştürülüyor..."
                  : "PDF, EPUB, TXT veya MD Dosyasını Sürükleyin / Seçin"}
              </div>
              <p className="text-[11px] text-muted">
                Sayfa numaraları ve satır sonu tirelemeleri otomatik temizlenir
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                PDF
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                EPUB
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                TXT / MD
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.txt,.md,.markdown,application/pdf,application/epub+zip,text/plain,text/markdown"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleUploadFile(file);
              }}
              className="hidden"
            />
          </label>

          {/* 1-Click Sample PDF Test Action */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted">
              Hızlı deneme için örnek kitap:
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
                  await handleUploadFile(samplePdf);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Örnek PDF Yükle &amp; Aç</span>
              </button>
            </div>
          </div>

          {uploadError && (
            <p className="text-xs text-rose-400 font-medium">{uploadError}</p>
          )}
        </div>
      </div>

      {/* =====================================================================
          ROW 2: "GÜNLÜK OKUMA RUTİNİ & HIZ EVRİMİ" PANEL
      ===================================================================== */}
      <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Günlük Okuma Rutini &amp; Hız Evrimi</span>
            </div>
            <h2 className="text-xl font-extrabold">
              Bugünkü Okuma Hedefin ve 7 Günlük WPM İvmesi
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{user.streak_days} Günlük Okuma Serisi</span>
            </span>
            <button
              onClick={resetDemoData}
              className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-xs text-muted hover:text-foreground flex items-center gap-1 transition-colors"
              title="Verileri sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* LEFT (5 COLS): DAILY READING TARGETS (MINUTES & WORDS) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Goal Card 1: Daily Minutes Read */}
            <div className="p-5 rounded-2xl bg-surface-elevated/70 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Günlük Okuma Süresi Hedefi</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400">
                  %{minutesPct}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-extrabold tabular-nums">
                  Bugün {dailyReadingMinutes}{" "}
                  <span className="text-sm font-semibold text-muted">
                    / {dailyReadingGoalMinutes} dk okundu
                  </span>
                </div>
              </div>

              <div className="h-2.5 w-full rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${minutesPct}%` }}
                />
              </div>
            </div>

            {/* Goal Card 2: Daily Words Read */}
            <div className="p-5 rounded-2xl bg-surface-elevated/70 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span>Günlük Kelime Hedefi</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">
                  %{wordsPct}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-extrabold tabular-nums">
                  {dailyWordsRead.toLocaleString("tr-TR")}{" "}
                  <span className="text-sm font-semibold text-muted">
                    / {dailyWordsGoal.toLocaleString("tr-TR")} kelime
                  </span>
                </div>
              </div>

              <div className="h-2.5 w-full rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${wordsPct}%` }}
                />
              </div>
            </div>

            {/* Supporting Tools Quick Bar */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link
                href="/drills"
                className="p-3.5 rounded-2xl bg-surface-elevated hover:bg-indigo-500/10 border border-border hover:border-indigo-500/40 flex items-center justify-between transition-all"
              >
                <div>
                  <div className="text-xs font-bold">Göz Isınma (Drills)</div>
                  <div className="text-[11px] text-muted">2 dk Okuma Öncesi</div>
                </div>
                <Eye className="w-4 h-4 text-indigo-400" />
              </Link>

              <Link
                href="/speed-test"
                className="p-3.5 rounded-2xl bg-surface-elevated hover:bg-emerald-500/10 border border-border hover:border-emerald-500/40 flex items-center justify-between transition-all"
              >
                <div>
                  <div className="text-xs font-bold">Kalibrasyon &amp; Analiz</div>
                  <div className="text-[11px] text-muted">
                    WPM: {user.current_wpm} • %{user.comprehension_rate}
                  </div>
                </div>
                <Gauge className="w-4 h-4 text-emerald-400" />
              </Link>
            </div>
          </div>

          {/* RIGHT (7 COLS): 7-DAY PROGRESSIVE WPM LINE CHART */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-surface-elevated/50 border border-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base">
                  Hız İvmesi Grafiği (Son 7 Günlük WPM Artışı)
                </h3>
                <p className="text-xs text-muted">
                  Kitap okurken Kademeli İvme (Auto-Ramp) ile ulaşılan ortalama WPM gelişimi
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold tabular-nums">
                {wpmGain7Days >= 0 ? `+${wpmGain7Days}` : wpmGain7Days} WPM (7 Gün)
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={last7DaysWpmData}
                  margin={{ top: 10, right: 16, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-color)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wpm"
                    name="Okuma Hızı (WPM)"
                    stroke="#B85D3B"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#B85D3B", strokeWidth: 2, stroke: "#F6F1E7" }}
                    activeDot={{ r: 6, fill: "#96482B" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="etkiliWpm"
                    name="Net Etkili Hız (E-WPM)"
                    stroke="#5C6B57"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "#5C6B57" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted pt-1 border-t border-border/60">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Başlangıç: <strong className="text-foreground">{user.baseline_wpm} WPM</strong> &rarr; Güncel:{" "}
                  <strong className="text-indigo-400">{user.current_wpm} WPM</strong>
                </span>
              </span>
              <span>
                Okuduğunu Anlama Ortalaması:{" "}
                <strong className="text-emerald-400">%{user.comprehension_rate}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
