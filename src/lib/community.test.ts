import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addComment,
  createQuote,
  fetchBookAnnotations,
  fetchReviews,
  setLike,
  upsertAnnotation,
  upsertReview,
} from "./community";

interface Call {
  table: string;
  ops: { op: string; args: unknown[] }[];
}

type Response = { data?: unknown; error?: { message: string } | null };

/**
 * supabase-js sorgu zincirini taklit eder: her çağrı kaydedilir, zincir
 * await edildiğinde `respond(table, ops)` sonucu döner.
 */
function fakeClient(respond: (call: Call) => Response) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const builder: Record<string, unknown> = {};
      for (const op of [
        "select",
        "eq",
        "in",
        "order",
        "limit",
        "insert",
        "upsert",
        "delete",
        "single",
      ]) {
        builder[op] = (...args: unknown[]) => {
          call.ops.push({ op, args });
          return builder;
        };
      }
      builder.then = (resolve: (r: Response) => unknown) =>
        resolve({ error: null, ...respond(call) });
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const opArgs = (call: Call, op: string) =>
  call.ops.find((o) => o.op === op)?.args;

describe("fetchReviews", () => {
  it("görünüm satırlarını eşler ve yorumları ekler", async () => {
    const { client, calls } = fakeClient(({ table }) => {
      if (table === "reviews_feed") {
        return {
          data: [
            {
              id: "r1",
              user_id: "u1",
              user_name: "Mert",
              book_id: "b1",
              book_title: "Kitap",
              book_author: "Yazar",
              rating: "4",
              review_text: "iyi",
              achieved_wpm: 410,
              likes_count: "3",
              liked_by_me: true,
              created_at: "2026-10-27T00:00:00Z",
            },
          ],
        };
      }
      return {
        data: [
          { id: "c1", target_id: "r1", user_id: "u2", author_name: "Ali", content: "katılıyorum", created_at: "t" },
        ],
      };
    });

    const [review] = await fetchReviews(client);
    expect(review).toMatchObject({
      id: "r1",
      user_name: "Mert",
      rating: 4,
      likes: 3,
      liked_by_me: true,
      achieved_wpm: 410,
    });
    expect(review.comments).toEqual([
      { id: "c1", user_id: "u2", author_name: "Ali", content: "katılıyorum", created_at: "t" },
    ]);
    const commentsCall = calls.find((c) => c.table === "comments_feed")!;
    expect(opArgs(commentsCall, "eq")).toEqual(["target_type", "review"]);
    expect(opArgs(commentsCall, "in")).toEqual(["target_id", ["r1"]]);
  });

  it("inceleme yoksa yorum sorgusu yapmaz", async () => {
    const { client, calls } = fakeClient(() => ({ data: [] }));
    expect(await fetchReviews(client)).toEqual([]);
    expect(calls.some((c) => c.table === "comments_feed")).toBe(false);
  });

  it("PostgREST hatasını Error olarak fırlatır", async () => {
    const { client } = fakeClient(() => ({ error: { message: "permission denied" } }));
    await expect(fetchReviews(client)).rejects.toThrow("permission denied");
  });
});

describe("upsertReview", () => {
  it("id göndermez ve (user_id, book_id) üzerinde birleştirir", async () => {
    const { client, calls } = fakeClient(({ table }) =>
      table === "reviews"
        ? { data: { id: "new-id" } }
        : table === "reviews_feed"
        ? { data: { id: "new-id", user_id: "u1", review_text: "x", rating: 5 } }
        : { data: [] }
    );
    await upsertReview(client, "u1", {
      book_id: "b1",
      book_title: "T".repeat(500),
      book_author: "A",
      rating: 5,
      review_text: "  metin  ",
      achieved_wpm: 9999,
    });
    const upsert = calls.find((c) => c.table === "reviews")!;
    const [payload, options] = opArgs(upsert, "upsert") as [Record<string, unknown>, unknown];
    expect(payload).not.toHaveProperty("id");
    expect(options).toEqual({ onConflict: "user_id,book_id" });
    expect(payload.user_id).toBe("u1");
    expect(payload.review_text).toBe("metin");
    expect((payload.book_title as string).length).toBe(300);
    expect(payload.achieved_wpm).toBeNull();
  });
});

describe("createQuote", () => {
  it("alanları sınırlar ve boş notu null yapar", async () => {
    const { client, calls } = fakeClient(({ table }) =>
      table === "quote_posts" ? { data: { id: "q1" } } : { data: { id: "q1", quote_text: "x" } }
    );
    await createQuote(client, "u1", {
      book_id: "b1",
      book_title: "T",
      book_author: "A",
      quote_text: "alıntı",
      word_index: -5,
      note_comment: "   ",
      user_wpm: 320,
    });
    const [payload] = opArgs(calls.find((c) => c.table === "quote_posts")!, "insert") as [Record<string, unknown>];
    expect(payload).toMatchObject({ user_id: "u1", word_index: 0, note_comment: null, user_wpm: 320 });
  });
});

describe("setLike", () => {
  it("beğenmek çift kaydı yok sayan upsert'tür", async () => {
    const { client, calls } = fakeClient(() => ({}));
    await setLike(client, "u1", "review", "r1", true);
    const [row, options] = opArgs(calls[0], "upsert") as [unknown, unknown];
    expect(row).toEqual({ user_id: "u1", target_type: "review", target_id: "r1" });
    expect(options).toMatchObject({ ignoreDuplicates: true });
  });

  it("beğeniyi geri almak üç koşulla siler", async () => {
    const { client, calls } = fakeClient(() => ({}));
    await setLike(client, "u1", "annotation", "n1", false);
    const eqs = calls[0].ops.filter((o) => o.op === "eq").map((o) => o.args);
    expect(calls[0].ops[0].op).toBe("delete");
    expect(eqs).toEqual([
      ["user_id", "u1"],
      ["target_type", "annotation"],
      ["target_id", "n1"],
    ]);
  });
});

describe("addComment", () => {
  it("içeriği kırpar ve yazarı ekler", async () => {
    const { client, calls } = fakeClient(({ table }) =>
      table === "comments"
        ? { data: { id: "c1" } }
        : { data: { id: "c1", user_id: "u1", author_name: "Ben", content: "merhaba", created_at: "t" } }
    );
    const comment = await addComment(client, "u1", "quote_post", "q1", "  merhaba  ");
    const [payload] = opArgs(calls.find((c) => c.table === "comments")!, "insert") as [Record<string, unknown>];
    expect(payload).toEqual({ user_id: "u1", target_type: "quote_post", target_id: "q1", content: "merhaba" });
    expect(comment.author_name).toBe("Ben");
  });
});

describe("annotations", () => {
  it("yalnızca kitabın herkese açık notlarını sorgular", async () => {
    const { client, calls } = fakeClient(() => ({
      data: [
        { id: "n1", user_id: "u2", book_id: "b1", word_index: 4, type: "highlight", selected_text: "x", content: "", is_public: true, likes_count: 2, liked_by_me: false, author_name: "Mert", author_wpm: 400, created_at: "t" },
      ],
    }));
    const notes = await fetchBookAnnotations(client, "b1");
    expect(calls[0].table).toBe("annotations_feed");
    expect(calls[0].ops.filter((o) => o.op === "eq").map((o) => o.args)).toEqual([
      ["book_id", "b1"],
      ["is_public", true],
    ]);
    expect(notes[0]).toMatchObject({ id: "n1", type: "highlight", likes_count: 2, author_wpm: 400 });
  });

  it("notu id üzerinde upsert eder ve sınırları uygular", async () => {
    const { client, calls } = fakeClient(() => ({}));
    await upsertAnnotation(client, "u1", {
      id: "11111111-1111-1111-1111-111111111111",
      book_id: "b1",
      word_index: -1,
      content: "c".repeat(5000),
      created_at: "2026-10-27T00:00:00Z",
      type: "note",
      is_public: true,
      author_wpm: 5000,
    });
    const [payload, options] = opArgs(calls[0], "upsert") as [Record<string, unknown>, unknown];
    expect(options).toEqual({ onConflict: "id" });
    expect(payload).toMatchObject({ user_id: "u1", word_index: 0, is_public: true, author_wpm: null });
    expect((payload.content as string).length).toBe(4000);
  });
});
