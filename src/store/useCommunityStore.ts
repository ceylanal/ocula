"use client";

import { create } from "zustand";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUserId, getSupabaseClient, toError } from "@/lib/supabase";
import {
  CommunityTargetType,
  addComment,
  createQuote,
  deleteAnnotation,
  deleteComment,
  deletePost,
  ensureProfile,
  fetchBookAnnotations,
  fetchQuotes,
  fetchReviews,
  setLike,
  upsertAnnotation,
  upsertReview,
} from "@/lib/community";
import { useOkurLabStore } from "@/store/useOkurLabStore";
import { BookNote, CommunityQuotePost, CommunityReview } from "@/types";

/**
 * Okur Salonu ve Marginalia'nın sunucu durumu. Kalıcı değildir: veri Supabase'dedir ve
 * her oturumda yeniden çekilir. Sahte/örnek veri içermez.
 *
 * Durum:
 *  - unconfigured: Supabase URL/anon anahtarı tanımlı değil
 *  - signed_out  : geçerli bir Supabase oturumu yok ya da yerel profil oturumdaki
 *                  hesapla eşleşmiyor (ör. yerel demo hesap)
 *  - ready       : okuma ve yazma mümkün
 */
export type CommunityStatus = "unconfigured" | "signed_out" | "ready";

export type ActionResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "signed_out" | "error"; message: string };

interface Context {
  client: SupabaseClient;
  userId: string;
}

interface CommunityState {
  status: CommunityStatus;
  loading: boolean;
  error: string | null;
  reviews: CommunityReview[];
  quotes: CommunityQuotePost[];
  marginalia: Record<string, BookNote[]>;

  loadFeed: () => Promise<void>;
  loadMarginalia: (bookId: string) => Promise<void>;
  publishReview: (input: {
    book_id: string;
    book_title: string;
    book_author: string;
    rating: number;
    review_text: string;
    achieved_wpm: number;
  }) => Promise<ActionResult>;
  publishQuote: (input: {
    book_id: string;
    book_title: string;
    book_author: string;
    quote_text: string;
    word_index: number;
    note_comment?: string;
  }) => Promise<ActionResult>;
  removePost: (type: "review" | "quote_post", id: string) => Promise<ActionResult>;
  toggleLike: (type: CommunityTargetType, id: string, bookId?: string) => Promise<ActionResult>;
  postComment: (type: "review" | "quote_post", id: string, content: string) => Promise<ActionResult>;
  removeComment: (type: "review" | "quote_post", postId: string, commentId: string) => Promise<ActionResult>;
  pushAnnotation: (note: BookNote) => Promise<ActionResult>;
  removeAnnotation: (note: BookNote) => Promise<ActionResult>;
}

type ContextResult =
  | { ok: true; ctx: Context }
  | { ok: false; reason: "unconfigured" | "signed_out" };

const NOT_CONFIGURED =
  "Topluluk özellikleri için Supabase bağlantısı yapılandırılmamış.";
const SIGNED_OUT =
  "Topluluk özellikleri için Supabase hesabınla giriş yapmalısın.";

/**
 * İstemciyi ve oturumu çözer. Yerel profil, Supabase oturumundaki hesapla aynı değilse
 * (yerel demo hesaplar gibi) oturum yok sayılır; böylece başka bir adla gönderi yazılamaz.
 */
async function resolveContext(): Promise<ContextResult> {
  const main = useOkurLabStore.getState();
  const client = getSupabaseClient(main.supabaseUrl, main.supabaseAnonKey);
  if (!client) return { ok: false, reason: "unconfigured" };
  const userId = await getSessionUserId(client);
  if (!userId || !main.isAuthenticated || main.user.id !== userId) {
    return { ok: false, reason: "signed_out" };
  }
  return { ok: true, ctx: { client, userId } };
}

function blocked(
  reason: "unconfigured" | "signed_out"
): Extract<ActionResult, { ok: false }> {
  return {
    ok: false,
    reason,
    message: reason === "unconfigured" ? NOT_CONFIGURED : SIGNED_OUT,
  };
}

function failure(err: unknown): Extract<ActionResult, { ok: false }> {
  const message = toError(err).message;
  return {
    ok: false,
    reason: "error",
    message: /failed to fetch|networkerror|load failed/i.test(message)
      ? "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et."
      : message,
  };
}

// Profil yalnızca ad/WPM/kullanıcı değiştiğinde yeniden yazılır.
let ensuredProfileKey = "";

export const useCommunityStore = create<CommunityState>()((set, get) => {
  /** Oturum çözümü + profil güvencesi; durum alanını günceller. */
  const connect = async (): Promise<ContextResult> => {
    const res = await resolveContext();
    if (!res.ok) {
      set({ status: res.reason });
      return res;
    }
    const { user } = useOkurLabStore.getState();
    const profileKey = `${res.ctx.userId}|${user.name}|${user.current_wpm}`;
    if (profileKey !== ensuredProfileKey) {
      await ensureProfile(res.ctx.client, {
        id: res.ctx.userId,
        name: user.name,
        wpm: user.current_wpm,
      });
      ensuredProfileKey = profileKey;
    }
    set({ status: "ready" });
    return res;
  };

  const run = async (
    action: (ctx: Context) => Promise<void>
  ): Promise<ActionResult> => {
    try {
      const res = await connect();
      if (!res.ok) return blocked(res.reason);
      await action(res.ctx);
      return { ok: true };
    } catch (err) {
      return failure(err);
    }
  };

  return {
    status: "unconfigured",
    loading: false,
    error: null,
    reviews: [],
    quotes: [],
    marginalia: {},

    loadFeed: async () => {
      set({ loading: true, error: null });
      try {
        const res = await connect();
        if (!res.ok) {
          set({ reviews: [], quotes: [], loading: false });
          return;
        }
        const [reviews, quotes] = await Promise.all([
          fetchReviews(res.ctx.client),
          fetchQuotes(res.ctx.client),
        ]);
        set({ reviews, quotes, loading: false });
      } catch (err) {
        set({ loading: false, error: toError(err).message });
      }
    },

    loadMarginalia: async (bookId) => {
      try {
        const res = await connect();
        if (!res.ok) {
          set((s) => ({ marginalia: { ...s.marginalia, [bookId]: [] } }));
          return;
        }
        const notes = await fetchBookAnnotations(res.ctx.client, bookId);
        set((s) => ({ marginalia: { ...s.marginalia, [bookId]: notes } }));
      } catch (err) {
        set({ error: toError(err).message });
      }
    },

    publishReview: (input) =>
      run(async ({ client, userId }) => {
        const review = await upsertReview(client, userId, input);
        set((s) => ({
          reviews: [review, ...s.reviews.filter((r) => r.id !== review.id)],
        }));
      }),

    publishQuote: (input) =>
      run(async ({ client, userId }) => {
        const quote = await createQuote(client, userId, {
          ...input,
          user_wpm: useOkurLabStore.getState().user.current_wpm,
        });
        set((s) => ({ quotes: [quote, ...s.quotes] }));
      }),

    removePost: (type, id) =>
      run(async ({ client }) => {
        await deletePost(client, type, id);
        set((s) =>
          type === "review"
            ? { reviews: s.reviews.filter((r) => r.id !== id) }
            : { quotes: s.quotes.filter((q) => q.id !== id) }
        );
      }),

    toggleLike: (type, id, bookId) =>
      run(async ({ client, userId }) => {
        const state = get();
        const current =
          type === "review"
            ? state.reviews.find((r) => r.id === id)?.liked_by_me
            : type === "quote_post"
            ? state.quotes.find((q) => q.id === id)?.liked_by_me
            : (bookId ? state.marginalia[bookId] || [] : [])
                .find((n) => n.id === id)?.liked_by_me;
        const liked = !current;
        const delta = liked ? 1 : -1;

        const apply = (likedNow: boolean, change: number) =>
          set((s) => {
            if (type === "review") {
              return {
                reviews: s.reviews.map((r) =>
                  r.id === id
                    ? { ...r, liked_by_me: likedNow, likes: Math.max(0, r.likes + change) }
                    : r
                ),
              };
            }
            if (type === "quote_post") {
              return {
                quotes: s.quotes.map((q) =>
                  q.id === id
                    ? { ...q, liked_by_me: likedNow, likes: Math.max(0, q.likes + change) }
                    : q
                ),
              };
            }
            if (!bookId) return {};
            return {
              marginalia: {
                ...s.marginalia,
                [bookId]: (s.marginalia[bookId] || []).map((n) =>
                  n.id === id
                    ? {
                        ...n,
                        liked_by_me: likedNow,
                        likes_count: Math.max(0, (n.likes_count || 0) + change),
                      }
                    : n
                ),
              },
            };
          });

        apply(liked, delta);
        try {
          await setLike(client, userId, type, id, liked);
        } catch (err) {
          apply(!liked, -delta);
          throw err;
        }
      }),

    postComment: (type, id, content) =>
      run(async ({ client, userId }) => {
        const comment = await addComment(client, userId, type, id, content);
        set((s) =>
          type === "review"
            ? {
                reviews: s.reviews.map((r) =>
                  r.id === id ? { ...r, comments: [...r.comments, comment] } : r
                ),
              }
            : {
                quotes: s.quotes.map((q) =>
                  q.id === id ? { ...q, comments: [...q.comments, comment] } : q
                ),
              }
        );
      }),

    removeComment: (type, postId, commentId) =>
      run(async ({ client }) => {
        await deleteComment(client, commentId);
        set((s) =>
          type === "review"
            ? {
                reviews: s.reviews.map((r) =>
                  r.id === postId
                    ? { ...r, comments: r.comments.filter((c) => c.id !== commentId) }
                    : r
                ),
              }
            : {
                quotes: s.quotes.map((q) =>
                  q.id === postId
                    ? { ...q, comments: q.comments.filter((c) => c.id !== commentId) }
                    : q
                ),
              }
        );
      }),

    // Yerel not zaten ana store'dadır; burada yalnızca buluta yazılır ve açıksa panoya eklenir.
    pushAnnotation: (note) =>
      run(async ({ client, userId }) => {
        await upsertAnnotation(client, userId, note);
        if (note.is_public) {
          await get().loadMarginalia(note.book_id);
        }
      }),

    removeAnnotation: (note) =>
      run(async ({ client }) => {
        await deleteAnnotation(client, note.id);
        set((s) => ({
          marginalia: {
            ...s.marginalia,
            [note.book_id]: (s.marginalia[note.book_id] || []).filter(
              (n) => n.id !== note.id
            ),
          },
        }));
      }),
  };
});
