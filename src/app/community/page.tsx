"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Quote,
  Star,
  Heart,
  MessageCircle,
  Send,
  BookOpen,
  Sparkles,
  Feather,
  Gauge,
  Highlighter,
  Plus,
  Compass,
  Trash2,
  RefreshCw,
  LogIn,
  AlertTriangle,
} from "lucide-react";
import { useOkurLabStore } from "@/store/useOkurLabStore";
import { ActionResult, useCommunityStore } from "@/store/useCommunityStore";

const OPEN_AUTH_EVENT = "okurlab:open-auth";

function initials(name: string): string {
  return (name.trim().slice(0, 1) || "O").toLocaleUpperCase("tr-TR");
}

export default function CommunityOkurSalonuPage() {
  const {
    user,
    books,
    communityBooks,
    readingProgress,
    isAuthenticated,
    supabaseUrl,
    supabaseAnonKey,
  } = useOkurLabStore();
  const {
    status,
    loading,
    error,
    reviews,
    quotes,
    loadFeed,
    publishReview,
    publishQuote,
    removePost,
    toggleLike,
    postComment,
    removeComment,
  } = useCommunityStore();

  const [actionError, setActionError] = useState<string | null>(null);
  const ready = status === "ready";

  // Oturum, hesap veya bağlantı ayarı değiştiğinde akışı yeniden çek
  useEffect(() => {
    loadFeed();
  }, [loadFeed, user.id, isAuthenticated, supabaseUrl, supabaseAnonKey]);

  // Başarısız işlemin nedenini göster; başarılıysa hatayı temizle
  const handleResult = (result: ActionResult): boolean => {
    setActionError(result.ok ? null : result.message);
    return result.ok;
  };

  const [activeFilter, setActiveFilter] = useState<
    "all" | "reviews" | "quotes"
  >("all");
  const [composerTab, setComposerTab] = useState<"review" | "quote">("review");
  const [showComposer, setShowComposer] = useState<boolean>(false);

  // All selectable books (user's books + community books)
  const allBooks = useMemo(() => {
    const map = new Map<string, { id: string; title: string; author: string }>();
    books.forEach((b) =>
      map.set(b.id, { id: b.id, title: b.title, author: b.author })
    );
    communityBooks.forEach((b) =>
      map.set(b.id, { id: b.id, title: b.title, author: b.author })
    );
    return Array.from(map.values());
  }, [books, communityBooks]);

  // Review composer state
  const [selectedBookId, setSelectedBookId] = useState<string>(
    allBooks[0]?.id || ""
  );
  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");

  // Quote card composer state
  const [quoteText, setQuoteText] = useState<string>("");
  const [quoteNoteText, setQuoteNoteText] = useState<string>("");

  // Comment input drafts keyed by post ID
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {}
  );
  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({});

  const selectedBookMeta = useMemo(
    () =>
      allBooks.find((b) => b.id === selectedBookId) ||
      allBooks[0] || { id: "", title: "Kitap", author: "" },
    [allBooks, selectedBookId]
  );

  const selectedBookWpm =
    readingProgress[selectedBookMeta.id]?.preferred_wpm ||
    user.current_wpm ||
    280;

  const handlePublishReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim() || !selectedBookMeta.id) return;
    const result = await publishReview({
      book_id: selectedBookMeta.id,
      book_title: selectedBookMeta.title,
      book_author: selectedBookMeta.author,
      rating,
      achieved_wpm: selectedBookWpm,
      review_text: reviewText.trim(),
    });
    if (handleResult(result)) {
      setReviewText("");
      setShowComposer(false);
      setActiveFilter("all");
    }
  };

  const handlePublishQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteText.trim() || !selectedBookMeta.id) return;
    const result = await publishQuote({
      book_id: selectedBookMeta.id,
      book_title: selectedBookMeta.title,
      book_author: selectedBookMeta.author,
      quote_text: quoteText.trim(),
      note_comment:
        quoteNoteText.trim() ||
        `${selectedBookMeta.title} okumasından (${selectedBookWpm} WPM) altı çizili favori cümle.`,
      word_index:
        readingProgress[selectedBookMeta.id]?.current_word_index ?? 0,
    });
    if (handleResult(result)) {
      setQuoteText("");
      setQuoteNoteText("");
      setShowComposer(false);
      setActiveFilter("all");
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Az önce";
    }
  };

  return (
    <div className="space-y-8">
      {/* Literary Magazine Masthead Header */}
      <header className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B85D3B]/15 border border-[#B85D3B]/30 text-xs font-bold text-[#B85D3B]">
              <Feather className="w-3.5 h-3.5" />
              <span>OkurLab Edebiyat &amp; Hız Kulübü</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-foreground">
              Okur Salonu
            </h1>
            <p className="text-sm text-muted leading-relaxed font-serif">
              Okurların tamamladıkları kitaplardan{" "}
              <strong className="text-foreground">
                incelemeler, WPM hız rozetleri
              </strong>{" "}
              ve sayfa kenarlarından{" "}
              <strong className="text-[#B85D3B]">
                en çok altı çizilen alıntı kartları
              </strong>{" "}
              üzerine edebi sohbetler.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => loadFeed()}
              disabled={loading}
              title="Akışı yenile"
              className="p-3 rounded-2xl bg-background hover:bg-surface-elevated border border-border text-foreground disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowComposer((prev) => !prev)}
              disabled={!ready}
              className="px-5 py-3 rounded-2xl bg-[#B85D3B] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#A14D2E] text-[#F6F1E7] text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-[#B85D3B]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>İnceleme veya Alıntı Kartı Paylaş</span>
            </button>

            <Link
              href="/library"
              className="px-4 py-3 rounded-2xl bg-background hover:bg-surface-elevated border border-border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all text-foreground"
            >
              <Compass className="w-4 h-4 text-[#5C6B57]" />
              <span>Ortak Kütüphane</span>
            </Link>
          </div>
        </div>

        {/* Magazine Sub-Navigation Filter Bar */}
        <div className="mt-6 pt-5 border-t border-border/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {(
              [
                {
                  id: "all",
                  label: "Tüm Edebi Akış",
                  count: reviews.length + quotes.length,
                },
                {
                  id: "reviews",
                  label: "Kitap İncelemeleri & WPM Rozetleri",
                  count: reviews.length,
                },
                {
                  id: "quotes",
                  label: "Popüler Altı Çizili Alıntı Kartları",
                  count: quotes.length,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  activeFilter === tab.id
                    ? "bg-[#2C2520] text-[#F6F1E7] border-[#2C2520] shadow-sm"
                    : "bg-background border-border text-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeFilter === tab.id
                      ? "bg-[#B85D3B] text-[#F6F1E7]"
                      : "bg-surface text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <Users className="w-3.5 h-3.5 text-[#5C6B57]" />
            <span>
              Aktif Okur Profiliniz:{" "}
              <strong className="text-foreground font-serif">
                {user.name}
              </strong>{" "}
              •{" "}
              <strong className="text-[#B85D3B]">
                {user.current_wpm} WPM Rozeti
              </strong>
            </span>
          </div>
        </div>
      </header>

      {/* Bağlantı / oturum durumu ve hatalar */}
      {status === "unconfigured" && (
        <div
          role="status"
          className="p-5 rounded-3xl bg-surface border border-border flex items-start gap-3 text-sm"
        >
          <AlertTriangle className="w-5 h-5 text-[#B85D3B] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-serif font-bold">Topluluk bağlantısı kurulmamış</div>
            <p className="text-muted leading-relaxed">
              Okur Salonu, Supabase üzerinde çalışır. Profil menüsünden bulut
              bağlantısını (Project URL ve Anon Key) tanımla, ardından hesabınla
              giriş yap.
            </p>
          </div>
        </div>
      )}
      {status === "signed_out" && (
        <div
          role="status"
          className="p-5 rounded-3xl bg-surface border border-border flex flex-wrap items-center justify-between gap-4 text-sm"
        >
          <div className="space-y-1">
            <div className="font-serif font-bold">Okur Salonu&apos;nu görmek için giriş yap</div>
            <p className="text-muted leading-relaxed">
              İncelemeler ve alıntı kartları yalnızca Supabase hesabıyla giriş
              yapmış okurlara açıktır. Yerel demo hesaplarla topluluğa yazılamaz.
            </p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event(OPEN_AUTH_EVENT))}
            className="px-5 py-3 rounded-2xl bg-[#B85D3B] hover:bg-[#A14D2E] text-[#F6F1E7] text-xs font-bold flex items-center gap-2 shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>Giriş Yap</span>
          </button>
        </div>
      )}
      {(error || actionError) && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-sm flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{actionError || error}</span>
        </div>
      )}

      {/* Expandable Literary Composer (Publish Review or Quote Card) */}
      {showComposer && (
        <section className="p-6 rounded-3xl bg-surface border-2 border-[#B85D3B]/45 shadow-lg space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex rounded-xl bg-background p-1 border border-border">
              <button
                type="button"
                onClick={() => setComposerTab("review")}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  composerTab === "review"
                    ? "bg-[#B85D3B] text-[#F6F1E7]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Kitap İncelemesi &amp; WPM Rozeti Yaz</span>
              </button>
              <button
                type="button"
                onClick={() => setComposerTab("quote")}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  composerTab === "quote"
                    ? "bg-[#5C6B57] text-[#F6F1E7]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Quote className="w-3.5 h-3.5" />
                <span>Altı Çizili Alıntı Kartı Paylaş</span>
              </button>
            </div>

            <button
              onClick={() => setShowComposer(false)}
              className="text-xs font-semibold text-muted hover:text-foreground"
            >
              Kapat
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Kitap Seçin
              </label>
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-serif font-bold text-foreground focus:outline-none focus:border-[#B85D3B]"
              >
                {allBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.author}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Eklenecek Okuma Hızı Rozeti
                </div>
                <div className="text-xs text-foreground mt-0.5">
                  Bu kitaptaki güncel okuma temponuz otomatik iliştirilir
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-[#B85D3B]/15 border border-[#B85D3B]/35 text-[#B85D3B] text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Gauge className="w-3.5 h-3.5" />
                <span>{selectedBookWpm} WPM</span>
              </span>
            </div>
          </div>

          {composerTab === "review" ? (
            <form onSubmit={handlePublishReview} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted">Puanınız:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        starVal <= rating
                          ? "text-[#B85D3B]"
                          : "text-muted/40 hover:text-muted"
                      }`}
                    >
                      <Star
                        className="w-5 h-5"
                        fill={starVal <= rating ? "#B85D3B" : "none"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={`${selectedBookMeta.title} kitabı hakkındaki edebi incelemenizi ve Pacer / Auto-Ramp okuma deneyiminizi paylaşın...`}
                className="w-full rounded-2xl bg-background border border-border p-4 text-sm font-serif focus:outline-none focus:border-[#B85D3B]"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#B85D3B] hover:bg-[#A14D2E] text-[#F6F1E7] text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    İncelemeyi &amp; {selectedBookWpm} WPM Rozetini Yayınla
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePublishQuote} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                  Kitaptan Altı Çizili Alıntı Cümlesi
                </label>
                <textarea
                  rows={3}
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Kitaptan altını çizdiğiniz etkileyici cümleyi buraya yazın veya yapıştırın..."
                  className="w-full rounded-2xl bg-background border border-border p-3.5 text-sm font-serif italic focus:outline-none focus:border-[#5C6B57]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                  Kenar Notunuz / Yorumunuz
                </label>
                <input
                  type="text"
                  value={quoteNoteText}
                  onChange={(e) => setQuoteNoteText(e.target.value)}
                  placeholder="Bu alıntının sizde uyandırdığı düşünce..."
                  className="w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#5C6B57]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#5C6B57] hover:bg-[#4A5846] text-[#F6F1E7] text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  <Quote className="w-3.5 h-3.5" />
                  <span>Alıntı Kartını Okur Salonu&apos;nda Paylaş</span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Editorial 2-Column Magazine Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Reader Book Reviews & WPM Badges */}
        {(activeFilter === "all" || activeFilter === "reviews") && (
          <div
            className={
              activeFilter === "all" ? "lg:col-span-7 space-y-6" : "lg:col-span-12 space-y-6"
            }
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#B85D3B]">
                  Okur İncelemeleri &amp; Tempo Karnesi
                </div>
                <h2 className="text-xl font-serif font-bold text-foreground">
                  Son Kitap İncelemeleri &amp; WPM Rozetleri
                </h2>
              </div>
              <span className="text-xs text-muted font-serif italic">
                {reviews.length} inceleme
              </span>
            </div>

            <div className="space-y-5">
              {ready && !loading && reviews.length === 0 && (
                <p className="p-6 rounded-3xl bg-surface border border-dashed border-border text-sm text-muted text-center font-serif italic">
                  Henüz inceleme yok. İlk incelemeyi sen yaz.
                </p>
              )}
              {reviews.map((rev) => {
                const isExpanded = Boolean(expandedComments[rev.id]);
                const draft = commentDrafts[rev.id] || "";

                return (
                  <article
                    key={rev.id}
                    className="p-6 rounded-3xl bg-surface border border-border hover:border-[#B85D3B]/45 transition-all space-y-4 shadow-sm"
                  >
                    {/* Narrative Headline ("Ahmet Yılmaz, Dönüşüm kitabını 310 WPM ortalamayla tamamladı ve bir inceleme yazdı") */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[#B85D3B]/15 border border-[#B85D3B]/35 text-[#B85D3B] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                          {initials(rev.user_name)}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-serif leading-snug text-foreground">
                            <strong className="font-bold">
                              {rev.user_name}
                            </strong>
                            ,{" "}
                            <Link
                              href={`/library?book=${rev.book_id}`}
                              className="font-bold text-[#B85D3B] hover:underline"
                            >
                              {rev.book_title}
                            </Link>{" "}
                            kitabını{" "}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#5C6B57]/15 border border-[#5C6B57]/30 text-[#5C6B57] font-sans font-bold text-xs">
                              <Gauge className="w-3 h-3" />
                              {rev.achieved_wpm} WPM
                            </span>{" "}
                            ortalamayla tamamladı ve bir inceleme yazdı.
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            <span>{rev.book_author}</span>
                            <span>•</span>
                            <span>{formatDate(rev.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Star Rating Badge */}
                      <div className="flex items-center gap-0.5 bg-background px-2.5 py-1 rounded-xl border border-border shrink-0">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="w-3.5 h-3.5 text-[#B85D3B]"
                            fill={idx < rev.rating ? "#B85D3B" : "none"}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Literary Review Body */}
                    <p className="font-serif text-sm sm:text-[15px] text-foreground/95 leading-relaxed bg-background/60 p-4 rounded-2xl border border-border/70">
                      {rev.review_text}
                    </p>

                    {/* Footer Actions: Like, Comment, Open Book */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={async () => handleResult(await toggleLike("review", rev.id))}
                          className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
                            rev.liked_by_me
                              ? "bg-[#B85D3B] text-[#F6F1E7] border-[#B85D3B]"
                              : "bg-background border-border text-foreground hover:border-[#B85D3B]"
                          }`}
                        >
                          <Heart
                            className="w-3.5 h-3.5"
                            fill={rev.liked_by_me ? "#F6F1E7" : "none"}
                          />
                          <span>Beğen ({rev.likes})</span>
                        </button>

                        <button
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [rev.id]: !prev[rev.id],
                            }))
                          }
                          className="px-3 py-1.5 rounded-xl bg-background border border-border hover:border-[#5C6B57] text-foreground font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#5C6B57]" />
                          <span>Yorumlar ({rev.comments.length})</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        {rev.user_id === user.id && (
                          <button
                            onClick={async () =>
                              handleResult(await removePost("review", rev.id))
                            }
                            className="text-xs text-muted hover:text-[#B85D3B] flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Sil</span>
                          </button>
                        )}
                      <Link
                        href={`/library?book=${rev.book_id}&mode=pacer`}
                        className="text-xs font-bold text-[#B85D3B] hover:underline flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Kitabı Pacer İle Oku &rarr;</span>
                      </Link>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-border/80 space-y-3">
                        {rev.comments.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-2xl bg-background/85 border border-border text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-foreground">
                                  {c.author_name}
                                </span>
                              </div>
                              <span className="flex items-center gap-2 text-[10px] text-muted">
                                {formatDate(c.created_at)}
                                {(c.user_id === user.id ||
                                  rev.user_id === user.id) && (
                                  <button
                                    onClick={async () =>
                                      handleResult(
                                        await removeComment("review", rev.id, c.id)
                                      )
                                    }
                                    title="Yorumu sil"
                                    className="hover:text-[#B85D3B]"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            </div>
                            <p className="text-foreground/90 leading-relaxed">
                              {c.content}
                            </p>
                          </div>
                        ))}

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!draft.trim()) return;
                            const ok = handleResult(
                              await postComment("review", rev.id, draft)
                            );
                            if (ok) {
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [rev.id]: "",
                              }));
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={draft}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [rev.id]: e.target.value,
                              }))
                            }
                            placeholder="Bu incelemeye yorum yazın..."
                            className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#B85D3B]"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-2 rounded-xl bg-[#B85D3B] text-[#F6F1E7] text-xs font-bold flex items-center gap-1 shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            <span>Gönder</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Popular Underlined Quote Cards & Discussions */}
        {(activeFilter === "all" || activeFilter === "quotes") && (
          <div
            className={
              activeFilter === "all" ? "lg:col-span-5 space-y-6" : "lg:col-span-12 space-y-6"
            }
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5C6B57]">
                  Marginalia &amp; Altı Çizilenler
                </div>
                <h2 className="text-xl font-serif font-bold text-foreground">
                  Popüler Alıntı Kartları &amp; Tartışmalar
                </h2>
              </div>
              <span className="text-xs text-muted font-serif italic">
                {quotes.length} alıntı kartı
              </span>
            </div>

            <div className="space-y-5">
              {ready && !loading && quotes.length === 0 && (
                <p className="p-6 rounded-3xl bg-surface border border-dashed border-border text-sm text-muted text-center font-serif italic">
                  Henüz alıntı kartı yok. Okurken bir cümle seçip paylaşabilirsin.
                </p>
              )}
              {quotes.map((q) => {
                const isExpanded = Boolean(expandedComments[q.id]);
                const draft = commentDrafts[q.id] || "";

                return (
                  <article
                    key={q.id}
                    className="p-6 rounded-3xl bg-surface border border-border hover:border-[#5C6B57]/50 transition-all space-y-4 shadow-sm"
                  >
                    {/* Top Meta: Highlight Count Badge & Book Info */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E6D2B5] text-[#2C2520] border border-[#B85D3B]/35 text-[11px] font-bold">
                        <Highlighter className="w-3 h-3 text-[#B85D3B]" />
                        <span>{q.highlight_count} Okur Altını Çizdi</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-[#5C6B57]/15 text-[#5C6B57] text-[11px] font-bold">
                        {q.user_wpm} WPM
                      </span>
                    </div>

                    {/* Warm Parchment Underlined Quote Card */}
                    <blockquote className="p-5 rounded-2xl bg-background border-l-4 border-[#B85D3B] space-y-2 shadow-inner">
                      <p className="font-serif italic text-base sm:text-lg text-[#2C2520] leading-relaxed underline decoration-[#B85D3B]/45 decoration-2 underline-offset-4">
                        &ldquo;{q.quote_text}&rdquo;
                      </p>
                      <footer className="text-xs font-serif font-bold text-muted flex items-center justify-between pt-1">
                        <span>
                          — {q.book_title} ({q.book_author})
                        </span>
                        <Link
                          href={`/library?book=${q.book_id}`}
                          className="text-[#B85D3B] hover:underline font-sans text-[11px]"
                        >
                          Kelime #{q.word_index + 1} &rarr;
                        </Link>
                      </footer>
                    </blockquote>

                    {/* Reader's Marginalia Note */}
                    {q.note_comment && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted">
                          <strong className="text-foreground font-serif">
                            {q.user_name}
                          </strong>{" "}
                          kenar notu bıraktı:
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {q.note_comment}
                        </p>
                      </div>
                    )}

                    {/* Like & Comment Buttons */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => handleResult(await toggleLike("quote_post", q.id))}
                          className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
                            q.liked_by_me
                              ? "bg-[#B85D3B] text-[#F6F1E7] border-[#B85D3B]"
                              : "bg-background border-border text-foreground hover:border-[#B85D3B]"
                          }`}
                        >
                          <Heart
                            className="w-3.5 h-3.5"
                            fill={q.liked_by_me ? "#F6F1E7" : "none"}
                          />
                          <span>{q.likes}</span>
                        </button>

                        <button
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [q.id]: !prev[q.id],
                            }))
                          }
                          className="px-3 py-1.5 rounded-xl bg-background border border-border hover:border-[#5C6B57] text-foreground font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#5C6B57]" />
                          <span>Tartışma ({q.comments.length})</span>
                        </button>
                      </div>

                      <span className="flex items-center gap-2 text-[11px] text-muted">
                        {formatDate(q.created_at)}
                        {q.user_id === user.id && (
                          <button
                            onClick={async () =>
                              handleResult(await removePost("quote_post", q.id))
                            }
                            title="Alıntıyı sil"
                            className="hover:text-[#B85D3B]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    </div>

                    {/* Quote Discussion Thread */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-border/80 space-y-2.5">
                        {q.comments.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-2xl bg-background/85 border border-border text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-serif font-bold text-foreground">
                                  {c.author_name}
                                </span>
                              </div>
                              <span className="flex items-center gap-2 text-[10px] text-muted">
                                {formatDate(c.created_at)}
                                {(c.user_id === user.id ||
                                  q.user_id === user.id) && (
                                  <button
                                    onClick={async () =>
                                      handleResult(
                                        await removeComment("quote_post", q.id, c.id)
                                      )
                                    }
                                    title="Yorumu sil"
                                    className="hover:text-[#B85D3B]"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            </div>
                            <p className="text-foreground/90 leading-relaxed">
                              {c.content}
                            </p>
                          </div>
                        ))}

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!draft.trim()) return;
                            const ok = handleResult(
                              await postComment("quote_post", q.id, draft)
                            );
                            if (ok) {
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [q.id]: "",
                              }));
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={draft}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [q.id]: e.target.value,
                              }))
                            }
                            placeholder="Alıntı tartışmasına katılın..."
                            className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#5C6B57]"
                          />
                          <button
                            type="submit"
                            className="px-3 py-2 rounded-xl bg-[#5C6B57] text-[#F6F1E7] text-xs font-bold flex items-center gap-1 shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            <span>Yaz</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
