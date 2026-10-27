import { SupabaseClient } from "@supabase/supabase-js";
import { toError } from "@/lib/supabase";
import {
  BookNote,
  CommunityComment,
  CommunityQuotePost,
  CommunityReview,
} from "@/types";

/**
 * Okur Salonu ve Marginalia için Supabase servis katmanı (supabase/schema.sql, bölüm 5).
 * Okumalar *_feed görünümlerinden yapılır; yazmalar tablolara gider ve RLS ile korunur.
 * Bu modül durum tutmaz; çağıran oturum açmış bir istemci ve kullanıcı kimliği verir.
 */

export type CommunityTargetType = "annotation" | "review" | "quote_post";

const FEED_LIMIT = 50;

type Row = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function optNum(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : num(value);
}

function mapReview(row: Row): CommunityReview {
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    user_name: str(row.user_name, "Okur"),
    book_id: str(row.book_id),
    book_title: str(row.book_title),
    book_author: str(row.book_author),
    achieved_wpm: num(row.achieved_wpm),
    rating: num(row.rating, 5),
    review_text: str(row.review_text),
    likes: num(row.likes_count),
    liked_by_me: Boolean(row.liked_by_me),
    comments: [],
    created_at: str(row.created_at),
  };
}

function mapQuote(row: Row): CommunityQuotePost {
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    user_name: str(row.user_name, "Okur"),
    user_wpm: num(row.user_wpm),
    book_id: str(row.book_id),
    book_title: str(row.book_title),
    book_author: str(row.book_author),
    quote_text: str(row.quote_text),
    word_index: num(row.word_index),
    note_comment: row.note_comment ? str(row.note_comment) : undefined,
    highlight_count: num(row.highlight_count),
    likes: num(row.likes_count),
    liked_by_me: Boolean(row.liked_by_me),
    comments: [],
    created_at: str(row.created_at),
  };
}

function mapComment(row: Row): CommunityComment {
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    author_name: str(row.author_name, "Okur"),
    content: str(row.content),
    created_at: str(row.created_at),
  };
}

function mapAnnotation(row: Row): BookNote {
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    book_id: str(row.book_id),
    word_index: num(row.word_index),
    selected_text: row.selected_text ? str(row.selected_text) : undefined,
    content: str(row.content),
    created_at: str(row.created_at),
    author_name: str(row.author_name, "Okur"),
    author_wpm: optNum(row.author_wpm),
    type: row.type === "highlight" ? "highlight" : "note",
    is_public: Boolean(row.is_public),
    likes_count: num(row.likes_count),
    liked_by_me: Boolean(row.liked_by_me),
  };
}

export async function ensureProfile(
  client: SupabaseClient,
  profile: { id: string; name: string; wpm: number }
): Promise<void> {
  const { error } = await client.from("profiles").upsert(
    {
      id: profile.id,
      display_name: profile.name.trim().slice(0, 60) || "Okur",
      current_wpm: profile.wpm >= 0 && profile.wpm <= 1500 ? profile.wpm : null,
    },
    { onConflict: "id" }
  );
  if (error) throw toError(error);
}

/** Verilen hedeflerin yorumlarını hedef kimliğine göre gruplar (eskiden yeniye). */
export async function fetchComments(
  client: SupabaseClient,
  targetType: CommunityTargetType,
  targetIds: string[]
): Promise<Record<string, CommunityComment[]>> {
  const grouped: Record<string, CommunityComment[]> = {};
  if (targetIds.length === 0) return grouped;
  const { data, error } = await client
    .from("comments_feed")
    .select("*")
    .eq("target_type", targetType)
    .in("target_id", targetIds)
    .order("created_at", { ascending: true });
  if (error) throw toError(error);
  for (const row of (data || []) as Row[]) {
    const key = str(row.target_id);
    (grouped[key] ||= []).push(mapComment(row));
  }
  return grouped;
}

export async function fetchReviews(
  client: SupabaseClient
): Promise<CommunityReview[]> {
  const { data, error } = await client
    .from("reviews_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw toError(error);
  const reviews = ((data || []) as Row[]).map(mapReview);
  const comments = await fetchComments(
    client,
    "review",
    reviews.map((r) => r.id)
  );
  return reviews.map((r) => ({ ...r, comments: comments[r.id] || [] }));
}

export async function fetchQuotes(
  client: SupabaseClient
): Promise<CommunityQuotePost[]> {
  const { data, error } = await client
    .from("quote_posts_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw toError(error);
  const quotes = ((data || []) as Row[]).map(mapQuote);
  const comments = await fetchComments(
    client,
    "quote_post",
    quotes.map((q) => q.id)
  );
  return quotes.map((q) => ({ ...q, comments: comments[q.id] || [] }));
}

/**
 * Okur başına kitap başına tek inceleme vardır: varsa güncellenir. `id` gönderilmez;
 * gönderilseydi çakışmada birincil anahtar değişir ve beğeni/yorumlar sahipsiz kalırdı.
 */
export async function upsertReview(
  client: SupabaseClient,
  userId: string,
  input: {
    book_id: string;
    book_title: string;
    book_author: string;
    rating: number;
    review_text: string;
    achieved_wpm: number;
  }
): Promise<CommunityReview> {
  const { data, error } = await client
    .from("reviews")
    .upsert(
      {
        user_id: userId,
        book_id: input.book_id,
        book_title: input.book_title.slice(0, 300),
        book_author: input.book_author.slice(0, 300),
        rating: input.rating,
        review_text: input.review_text.trim().slice(0, 4000),
        achieved_wpm:
          input.achieved_wpm >= 0 && input.achieved_wpm <= 1500
            ? Math.round(input.achieved_wpm)
            : null,
      },
      { onConflict: "user_id,book_id" }
    )
    .select("id")
    .single();
  if (error) throw toError(error);
  const { data: row, error: feedErr } = await client
    .from("reviews_feed")
    .select("*")
    .eq("id", (data as Row).id as string)
    .single();
  if (feedErr) throw toError(feedErr);
  const review = mapReview(row as Row);
  const comments = await fetchComments(client, "review", [review.id]);
  return { ...review, comments: comments[review.id] || [] };
}

export async function createQuote(
  client: SupabaseClient,
  userId: string,
  input: {
    book_id: string;
    book_title: string;
    book_author: string;
    quote_text: string;
    word_index: number;
    note_comment?: string;
    user_wpm: number;
  }
): Promise<CommunityQuotePost> {
  const { data, error } = await client
    .from("quote_posts")
    .insert({
      user_id: userId,
      book_id: input.book_id,
      book_title: input.book_title.slice(0, 300),
      book_author: input.book_author.slice(0, 300),
      quote_text: input.quote_text.trim().slice(0, 2000),
      word_index: Math.max(0, input.word_index),
      note_comment: input.note_comment?.trim().slice(0, 1000) || null,
      user_wpm:
        input.user_wpm >= 0 && input.user_wpm <= 1500
          ? Math.round(input.user_wpm)
          : null,
    })
    .select("id")
    .single();
  if (error) throw toError(error);
  const { data: row, error: feedErr } = await client
    .from("quote_posts_feed")
    .select("*")
    .eq("id", (data as Row).id as string)
    .single();
  if (feedErr) throw toError(feedErr);
  return mapQuote(row as Row);
}

export async function deletePost(
  client: SupabaseClient,
  type: "review" | "quote_post",
  id: string
): Promise<void> {
  const { error } = await client
    .from(type === "review" ? "reviews" : "quote_posts")
    .delete()
    .eq("id", id);
  if (error) throw toError(error);
}

export async function setLike(
  client: SupabaseClient,
  userId: string,
  type: CommunityTargetType,
  targetId: string,
  liked: boolean
): Promise<void> {
  if (liked) {
    const { error } = await client
      .from("likes")
      .upsert(
        { user_id: userId, target_type: type, target_id: targetId },
        { onConflict: "user_id,target_type,target_id", ignoreDuplicates: true }
      );
    if (error) throw toError(error);
  } else {
    const { error } = await client
      .from("likes")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", type)
      .eq("target_id", targetId);
    if (error) throw toError(error);
  }
}

export async function addComment(
  client: SupabaseClient,
  userId: string,
  type: CommunityTargetType,
  targetId: string,
  content: string
): Promise<CommunityComment> {
  const { data, error } = await client
    .from("comments")
    .insert({
      user_id: userId,
      target_type: type,
      target_id: targetId,
      content: content.trim().slice(0, 1000),
    })
    .select("id")
    .single();
  if (error) throw toError(error);
  const { data: row, error: feedErr } = await client
    .from("comments_feed")
    .select("*")
    .eq("id", (data as Row).id as string)
    .single();
  if (feedErr) throw toError(feedErr);
  return mapComment(row as Row);
}

export async function deleteComment(
  client: SupabaseClient,
  commentId: string
): Promise<void> {
  const { error } = await client.from("comments").delete().eq("id", commentId);
  if (error) throw toError(error);
}

/** Bir kitabın herkese açık kenar notları ve altı çizili yerleri (kendininkiler dahil). */
export async function fetchBookAnnotations(
  client: SupabaseClient,
  bookId: string
): Promise<BookNote[]> {
  const { data, error } = await client
    .from("annotations_feed")
    .select("*")
    .eq("book_id", bookId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw toError(error);
  return ((data || []) as Row[]).map(mapAnnotation);
}

export async function upsertAnnotation(
  client: SupabaseClient,
  userId: string,
  note: BookNote
): Promise<void> {
  const { error } = await client.from("annotations").upsert(
    {
      id: note.id,
      user_id: userId,
      book_id: note.book_id,
      word_index: Math.max(0, note.word_index),
      type: note.type || "note",
      selected_text: note.selected_text?.slice(0, 2000) ?? null,
      content: note.content.slice(0, 4000),
      is_public: Boolean(note.is_public),
      author_wpm:
        note.author_wpm !== undefined &&
        note.author_wpm >= 0 &&
        note.author_wpm <= 1500
          ? Math.round(note.author_wpm)
          : null,
      created_at: note.created_at,
    },
    { onConflict: "id" }
  );
  if (error) throw toError(error);
}

export async function deleteAnnotation(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client.from("annotations").delete().eq("id", id);
  if (error) throw toError(error);
}
