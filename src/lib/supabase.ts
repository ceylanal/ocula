import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Book,
  ExerciseLog,
  UserProfile,
  UserReadingProgress,
} from "@/types";

const clientCache = new Map<string, SupabaseClient>();

export function getSupabaseClient(
  customUrl?: string,
  customAnonKey?: string
): SupabaseClient | null {
  const url =
    customUrl?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key =
    customAnonKey?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";

  if (!url || !key || !url.startsWith("http")) {
    return null;
  }

  const cacheKey = `${url}|${key}`;
  let client = clientCache.get(cacheKey);
  if (!client) {
    client = createClient(url, key);
    clientCache.set(cacheKey, client);
  }
  return client;
}

export interface SyncPayload {
  user: UserProfile;
  books: Book[];
  exerciseLogs: ExerciseLog[];
  readingProgress: Record<string, UserReadingProgress>;
}

const NO_SESSION_MESSAGE =
  "Bulut eşitlemesi için Supabase hesabıyla giriş yapılmış olmalıdır. Veriler yalnızca bu cihazda saklanıyor.";

async function getSessionUserId(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Log ve ilerleme kayıtlarının kimlikleri tabloda global birincil anahtardır;
 * farklı kullanıcıların aynı yerel kimliği (ör. "prog-book-1") çakıştırmaması için
 * kullanıcı kimliğiyle önek alırlar.
 */
function scopeId(userId: string, id: string): string {
  return id.startsWith(`${userId}:`) ? id : `${userId}:${id}`;
}

/**
 * Pushes local OkurLab state (user stats, custom books, exercise logs, reading progress)
 * to Supabase. Requires an authenticated Supabase session: row-level security only
 * admits rows owned by `auth.uid()`. Bundled demo books are not uploaded.
 */
export async function pushStateToSupabase(
  client: SupabaseClient,
  payload: SyncPayload
): Promise<{ ok: boolean; message: string }> {
  try {
    const uid = await getSessionUserId(client);
    if (!uid) return { ok: false, message: NO_SESSION_MESSAGE };

    // 1. Upsert user profile
    const { error: userErr } = await client.from("users").upsert(
      {
        id: uid,
        email: payload.user.email,
        name: payload.user.name,
        current_wpm: payload.user.current_wpm,
        baseline_wpm: payload.user.baseline_wpm,
        comprehension_rate: payload.user.comprehension_rate,
        streak_days: payload.user.streak_days,
      },
      { onConflict: "id" }
    );
    if (userErr) throw userErr;

    // 2. Upsert user-uploaded books
    const booksToUpsert = payload.books
      .filter((b) => b.is_custom)
      .map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        difficulty_level: b.difficulty_level,
        word_count: b.word_count,
        cover_gradient: b.cover_gradient,
        summary: b.summary,
        content: b.content,
        questions: b.questions || [],
        is_custom: true,
        owner_id: uid,
        owner_name: b.owner_name || payload.user.name,
        visibility: b.visibility || "private",
        share_code: b.share_code || null,
      }));

    if (booksToUpsert.length > 0) {
      const { error: bookErr } = await client
        .from("books")
        .upsert(booksToUpsert, { onConflict: "id" });
      if (bookErr) throw bookErr;
    }

    // 3. Upsert exercise logs
    if (payload.exerciseLogs.length > 0) {
      const logsToUpsert = payload.exerciseLogs.map((l) => ({
        id: scopeId(uid, l.id),
        user_id: uid,
        exercise_type: l.exercise_type,
        achieved_wpm: l.achieved_wpm,
        accuracy_score: l.accuracy_score,
        duration_seconds: l.duration_seconds,
        label: l.label || "",
        completed_at: l.completed_at,
      }));
      const { error: logErr } = await client
        .from("exercise_logs")
        .upsert(logsToUpsert, { onConflict: "id" });
      if (logErr) throw logErr;
    }

    // 4. Upsert reading progress
    const progressValues = Object.values(payload.readingProgress);
    if (progressValues.length > 0) {
      const progToUpsert = progressValues.map((p) => ({
        id: scopeId(uid, p.id),
        user_id: uid,
        book_id: p.book_id,
        current_word_index: p.current_word_index,
        reading_mode: p.reading_mode,
        preferred_wpm: p.preferred_wpm,
        updated_at: p.updated_at,
      }));
      const { error: progErr } = await client
        .from("user_reading_progress")
        .upsert(progToUpsert, { onConflict: "id" });
      if (progErr) throw progErr;
    }

    return {
      ok: true,
      message:
        "WPM skorlarınız, yüklediğiniz kitaplar ve okuma konumlarınız Supabase bulutuna eşitlendi.",
    };
  } catch (err: unknown) {
    const errMsg =
      err instanceof Error
        ? err.message
        : (err as { message?: string } | null)?.message ||
          "Bilinmeyen Supabase hatası";
    return {
      ok: false,
      message: `Supabase eşitleme hatası: ${errMsg}. (supabase/schema.sql dosyasını çalıştırdığınızdan emin olun.)`,
    };
  }
}

/**
 * Pulls the signed-in user's cloud state so phone & desktop stay in sync.
 */
export async function pullStateFromSupabase(
  client: SupabaseClient,
  fallbackUserId?: string
): Promise<{
  ok: boolean;
  message: string;
  data?: Partial<SyncPayload>;
}> {
  try {
    const uid = (await getSessionUserId(client)) || fallbackUserId || null;
    if (!uid) return { ok: false, message: NO_SESSION_MESSAGE };

    const [userRes, booksRes, logsRes, progRes] = await Promise.all([
      client.from("users").select("*").eq("id", uid).maybeSingle(),
      client
        .from("books")
        .select("*")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false }),
      client
        .from("exercise_logs")
        .select("*")
        .eq("user_id", uid)
        .order("completed_at", { ascending: true }),
      client.from("user_reading_progress").select("*").eq("user_id", uid),
    ]);

    if (userRes.error) throw userRes.error;
    if (booksRes.error) throw booksRes.error;
    if (logsRes.error) throw logsRes.error;
    if (progRes.error) throw progRes.error;

    const progressMap: Record<string, UserReadingProgress> = {};
    (progRes.data || []).forEach((row) => {
      progressMap[row.book_id] = {
        id: row.id,
        user_id: row.user_id,
        book_id: row.book_id,
        current_word_index: row.current_word_index,
        reading_mode: row.reading_mode,
        preferred_wpm: row.preferred_wpm,
        updated_at: row.updated_at,
      };
    });

    return {
      ok: true,
      message: "Buluttaki güncel kitaplarınız ve okuma ilerlemeniz bu cihaza indirildi.",
      data: {
        user: userRes.data || undefined,
        books:
          booksRes.data && booksRes.data.length > 0
            ? (booksRes.data as Book[])
            : undefined,
        exerciseLogs:
          logsRes.data && logsRes.data.length > 0
            ? (logsRes.data as ExerciseLog[])
            : undefined,
        readingProgress:
          Object.keys(progressMap).length > 0 ? progressMap : undefined,
      },
    };
  } catch (err: unknown) {
    const errMsg =
      err instanceof Error
        ? err.message
        : (err as { message?: string } | null)?.message ||
          "Bilinmeyen Supabase hatası";
    return {
      ok: false,
      message: `Buluttan veri çekilemedi: ${errMsg}`,
    };
  }
}
