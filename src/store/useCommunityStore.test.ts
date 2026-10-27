import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityReview } from "@/types";

vi.mock("@/lib/supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase")>()),
  getSupabaseClient: vi.fn(),
  getSessionUserId: vi.fn(),
}));
vi.mock("@/lib/community");

import { getSessionUserId, getSupabaseClient } from "@/lib/supabase";
import * as service from "@/lib/community";
import { useOkurLabStore } from "./useOkurLabStore";
import { useCommunityStore } from "./useCommunityStore";

const UID = "11111111-1111-1111-1111-111111111111";
const fakeClient = {} as never;

const review = (over: Partial<CommunityReview> = {}): CommunityReview => ({
  id: "r1",
  user_id: "other",
  user_name: "Mert",
  book_id: "b1",
  book_title: "Kitap",
  book_author: "Yazar",
  achieved_wpm: 300,
  rating: 5,
  review_text: "iyi",
  likes: 0,
  liked_by_me: false,
  comments: [],
  created_at: "2026-10-27T00:00:00Z",
  ...over,
});

/** Yerel profil UID ile eşleşen, giriş yapmış hesap kurar. */
function signIn() {
  useOkurLabStore.setState({
    ...useOkurLabStore.getInitialState(),
    isAuthenticated: true,
    supabaseUrl: "http://x",
    supabaseAnonKey: "k",
    user: { ...useOkurLabStore.getInitialState().user, id: UID, name: "Ceylan" },
  });
  vi.mocked(getSupabaseClient).mockReturnValue(fakeClient);
  vi.mocked(getSessionUserId).mockResolvedValue(UID);
}

beforeEach(() => {
  vi.resetAllMocks();
  useCommunityStore.setState(useCommunityStore.getInitialState(), true);
  useOkurLabStore.setState(useOkurLabStore.getInitialState(), true);
});

describe("oturum durumu", () => {
  it("Supabase tanımsızsa unconfigured olur ve veri çekmez", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);
    await useCommunityStore.getState().loadFeed();
    expect(useCommunityStore.getState().status).toBe("unconfigured");
    expect(service.fetchReviews).not.toHaveBeenCalled();
  });

  it("oturum yoksa signed_out olur", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(fakeClient);
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    await useCommunityStore.getState().loadFeed();
    expect(useCommunityStore.getState().status).toBe("signed_out");
  });

  it("yerel profil oturumdaki hesapla eşleşmiyorsa signed_out olur (demo hesaplar yazamaz)", async () => {
    signIn();
    useOkurLabStore.setState({ user: { ...useOkurLabStore.getState().user, id: "user-demo" } });
    const result = await useCommunityStore.getState().publishReview({
      book_id: "b1", book_title: "T", book_author: "A", rating: 5, review_text: "x", achieved_wpm: 300,
    });
    expect(result).toMatchObject({ ok: false, reason: "signed_out" });
    expect(service.upsertReview).not.toHaveBeenCalled();
  });

  it("çıkış yapılmışsa (isAuthenticated=false) signed_out olur", async () => {
    signIn();
    useOkurLabStore.setState({ isAuthenticated: false });
    await useCommunityStore.getState().loadFeed();
    expect(useCommunityStore.getState().status).toBe("signed_out");
  });

  it("hazırsa akışı yükler ve profili bir kez yazar", async () => {
    signIn();
    vi.mocked(service.fetchReviews).mockResolvedValue([review()]);
    vi.mocked(service.fetchQuotes).mockResolvedValue([]);
    await useCommunityStore.getState().loadFeed();
    await useCommunityStore.getState().loadFeed();
    const s = useCommunityStore.getState();
    expect(s.status).toBe("ready");
    expect(s.reviews).toHaveLength(1);
    expect(service.ensureProfile).toHaveBeenCalledTimes(1);
    expect(service.ensureProfile).toHaveBeenCalledWith(fakeClient, expect.objectContaining({ id: UID, name: "Ceylan" }));
  });

  it("yükleme hatasını error alanına yazar", async () => {
    signIn();
    vi.mocked(service.fetchReviews).mockRejectedValue(new Error("boom"));
    vi.mocked(service.fetchQuotes).mockResolvedValue([]);
    await useCommunityStore.getState().loadFeed();
    expect(useCommunityStore.getState()).toMatchObject({ error: "boom", loading: false });
  });
});

describe("beğeni", () => {
  it("iyimser günceller ve sunucuya yazar", async () => {
    signIn();
    useCommunityStore.setState({ reviews: [review({ likes: 2 })] });
    vi.mocked(service.setLike).mockResolvedValue();
    const result = await useCommunityStore.getState().toggleLike("review", "r1");
    expect(result.ok).toBe(true);
    expect(useCommunityStore.getState().reviews[0]).toMatchObject({ likes: 3, liked_by_me: true });
    expect(service.setLike).toHaveBeenCalledWith(fakeClient, UID, "review", "r1", true);
  });

  it("sunucu hatasında değişikliği geri alır ve hatayı bildirir", async () => {
    signIn();
    useCommunityStore.setState({ reviews: [review({ likes: 2, liked_by_me: false })] });
    vi.mocked(service.setLike).mockRejectedValue(new Error("RLS"));
    const result = await useCommunityStore.getState().toggleLike("review", "r1");
    expect(result).toMatchObject({ ok: false, reason: "error", message: "RLS" });
    expect(useCommunityStore.getState().reviews[0]).toMatchObject({ likes: 2, liked_by_me: false });
  });

  it("beğeniyi geri alırken sayacı sıfırın altına indirmez", async () => {
    signIn();
    useCommunityStore.setState({ reviews: [review({ likes: 0, liked_by_me: true })] });
    vi.mocked(service.setLike).mockResolvedValue();
    await useCommunityStore.getState().toggleLike("review", "r1");
    expect(useCommunityStore.getState().reviews[0]).toMatchObject({ likes: 0, liked_by_me: false });
  });

  it("not (annotation) beğenisini kitap panosunda günceller", async () => {
    signIn();
    useCommunityStore.setState({
      marginalia: { b1: [{ id: "n1", book_id: "b1", word_index: 1, content: "x", created_at: "t", likes_count: 1 }] },
    });
    vi.mocked(service.setLike).mockResolvedValue();
    await useCommunityStore.getState().toggleLike("annotation", "n1", "b1");
    expect(useCommunityStore.getState().marginalia.b1[0]).toMatchObject({ likes_count: 2, liked_by_me: true });
  });
});

describe("gönderi ve yorum", () => {
  it("publishReview aynı kimlikli eski kaydı değiştirir (güncelleme çoğaltmaz)", async () => {
    signIn();
    useCommunityStore.setState({ reviews: [review({ id: "mine", review_text: "eski" }), review({ id: "r2" })] });
    vi.mocked(service.upsertReview).mockResolvedValue(review({ id: "mine", review_text: "yeni" }));
    await useCommunityStore.getState().publishReview({
      book_id: "b1", book_title: "T", book_author: "A", rating: 4, review_text: "yeni", achieved_wpm: 300,
    });
    const reviews = useCommunityStore.getState().reviews;
    expect(reviews.map((r) => r.id)).toEqual(["mine", "r2"]);
    expect(reviews[0].review_text).toBe("yeni");
  });

  it("postComment yorumu ilgili gönderiye ekler", async () => {
    signIn();
    useCommunityStore.setState({ reviews: [review()] });
    vi.mocked(service.addComment).mockResolvedValue({ id: "c1", author_name: "Ben", content: "selam", created_at: "t" });
    await useCommunityStore.getState().postComment("review", "r1", "selam");
    expect(useCommunityStore.getState().reviews[0].comments.map((c) => c.id)).toEqual(["c1"]);
  });

  it("removeComment ve removePost yerel listeden de kaldırır", async () => {
    signIn();
    useCommunityStore.setState({
      reviews: [review({ comments: [{ id: "c1", author_name: "A", content: "x", created_at: "t" }] })],
    });
    vi.mocked(service.deleteComment).mockResolvedValue();
    vi.mocked(service.deletePost).mockResolvedValue();
    await useCommunityStore.getState().removeComment("review", "r1", "c1");
    expect(useCommunityStore.getState().reviews[0].comments).toEqual([]);
    await useCommunityStore.getState().removePost("review", "r1");
    expect(useCommunityStore.getState().reviews).toEqual([]);
  });

  it("ağ hatasını anlaşılır mesaja çevirir", async () => {
    signIn();
    vi.mocked(service.upsertReview).mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await useCommunityStore.getState().publishReview({
      book_id: "b1", book_title: "T", book_author: "A", rating: 5, review_text: "x", achieved_wpm: 300,
    });
    expect(result).toMatchObject({ ok: false, reason: "error" });
    expect(!result.ok && result.message).toMatch(/ulaşılamadı/);
  });
});

describe("Marginalia", () => {
  it("açık not buluta yazılınca kitabın panosunu yeniler", async () => {
    signIn();
    vi.mocked(service.upsertAnnotation).mockResolvedValue();
    vi.mocked(service.fetchBookAnnotations).mockResolvedValue([
      { id: "n1", book_id: "b1", word_index: 3, content: "açık", created_at: "t", is_public: true },
    ]);
    const note = { id: "n1", book_id: "b1", word_index: 3, content: "açık", created_at: "t", is_public: true };
    const result = await useCommunityStore.getState().pushAnnotation(note);
    expect(result.ok).toBe(true);
    expect(service.fetchBookAnnotations).toHaveBeenCalledWith(fakeClient, "b1");
    expect(useCommunityStore.getState().marginalia.b1).toHaveLength(1);
  });

  it("özel not panoyu yenilemez", async () => {
    signIn();
    vi.mocked(service.upsertAnnotation).mockResolvedValue();
    await useCommunityStore.getState().pushAnnotation({
      id: "n2", book_id: "b1", word_index: 1, content: "özel", created_at: "t", is_public: false,
    });
    expect(service.fetchBookAnnotations).not.toHaveBeenCalled();
  });

  it("oturum yokken not yazımı signed_out döner (not yerelde kalır)", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(fakeClient);
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    const result = await useCommunityStore.getState().pushAnnotation({
      id: "n3", book_id: "b1", word_index: 1, content: "x", created_at: "t", is_public: true,
    });
    expect(result).toMatchObject({ ok: false, reason: "signed_out" });
  });
});
