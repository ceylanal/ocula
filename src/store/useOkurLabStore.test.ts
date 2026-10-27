import { beforeEach, describe, expect, it } from "vitest";
import { useOkurLabStore } from "./useOkurLabStore";
import { isUuid } from "@/lib/ids";
import type { BookNote } from "@/types";

const reset = () => useOkurLabStore.setState(useOkurLabStore.getInitialState(), true);
const state = () => useOkurLabStore.getState();

beforeEach(reset);

describe("karşılama", () => {
  it("yeni kullanıcıda tamamlanmamış başlar ve completeOnboarding ile tamamlanır", () => {
    expect(state().onboardingDone).toBe(false);
    state().completeOnboarding();
    expect(state().onboardingDone).toBe(true);
  });
});

describe("notlar", () => {
  it("addBookNote uuid kimlikli notu döndürür ve başa ekler", () => {
    const note = state().addBookNote({
      book_id: "b1",
      word_index: 12,
      selected_text: "alıntı",
      content: "not",
    });
    expect(isUuid(note.id)).toBe(true);
    expect(note).toMatchObject({
      user_id: state().user.id,
      type: "note",
      is_public: true,
      likes_count: 0,
    });
    expect(state().bookNotes[0]).toEqual(note);
  });

  it("deleteBookNote yalnızca hedef notu siler", () => {
    const a = state().addBookNote({ book_id: "b1", word_index: 1, content: "a" });
    const b = state().addBookNote({ book_id: "b1", word_index: 2, content: "b" });
    state().deleteBookNote(a.id);
    expect(state().bookNotes.map((n) => n.id)).toEqual([b.id]);
  });

  it("başlangıçta örnek not yoktur", () => {
    expect(state().bookNotes).toEqual([]);
  });
});

describe("okuma ilerlemesi", () => {
  it("hız verilmeden güncellenen konum, kayıtlı hızı ve ölçülen hızı değiştirmez", () => {
    state().updateReadingProgress("book-neuro-focus", 10, "standard", 400);
    expect(state().readingProgress["book-neuro-focus"].preferred_wpm).toBe(400);
    // Sesli okumanın kelime senkronu hız göndermez; kullanıcının ayarı korunmalı
    state().updateReadingProgress("book-neuro-focus", 11, "standard");
    expect(state().readingProgress["book-neuro-focus"]).toMatchObject({
      current_word_index: 11,
      preferred_wpm: 400,
    });
    expect(state().user.current_wpm).toBe(400);
  });
});

describe("kalibrasyon", () => {
  it("addCalibrationRecord kayıt ekler ve kimlik/zaman atar", () => {
    state().addCalibrationRecord({
      article_id: "st-1",
      article_title: "Metin",
      difficulty: "Orta",
      wpm: 400,
      comprehension: 80,
      effective_wpm: 320,
      duration_seconds: 40,
    });
    const [record] = state().calibrationHistory;
    expect(record.id).toMatch(/^cal-/);
    expect(new Date(record.completed_at).getTime()).not.toBeNaN();
    expect(record.effective_wpm).toBe(320);
  });

  it("applyCalibratedWpm varsayılan ve kitap hızlarını günceller, ölçülen hıza dokunmaz", () => {
    const before = state().user.current_wpm;
    const bookIds = Object.keys(state().readingProgress);
    expect(bookIds.length).toBeGreaterThan(0);
    state().applyCalibratedWpm(555);
    expect(state().readerPrefs.defaultWpm).toBe(555);
    for (const id of bookIds) {
      expect(state().readingProgress[id].preferred_wpm).toBe(555);
    }
    expect(state().user.current_wpm).toBe(before);
  });
});

describe("loginOrSwitchAccount", () => {
  it("mevcut hesapla girişte Supabase kimliğini yerel profile bağlar", () => {
    const email = state().user.email;
    state().loginOrSwitchAccount({
      id: "11111111-1111-1111-1111-111111111111",
      name: "",
      email,
    });
    expect(state().user.id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("boş ad mevcut görünen adı korur", () => {
    const { email, name } = state().user;
    state().loginOrSwitchAccount({ id: "u-1", name: "", email });
    expect(state().user.name).toBe(name);
  });

  it("yeni e-postada Supabase kimliğiyle yeni hesap açar", () => {
    state().loginOrSwitchAccount({
      id: "22222222-2222-2222-2222-222222222222",
      name: "Yeni Okur",
      email: "yeni@example.com",
    });
    expect(state().user).toMatchObject({
      id: "22222222-2222-2222-2222-222222222222",
      name: "Yeni Okur",
      email: "yeni@example.com",
    });
    expect(state().calibrationHistory).toEqual([]);
  });
});

describe("applyCloudState", () => {
  it("bulut kitaplarını yerel kitaplarla kimliğe göre birleştirir", () => {
    const local = state().books;
    const cloudBook = { ...local[0], id: "cloud-1", title: "Bulut Kitabı", is_custom: true };
    state().applyCloudState({ books: [cloudBook] });
    expect(state().books).toHaveLength(local.length + 1);
    expect(state().books.some((b) => b.id === "cloud-1")).toBe(true);

    state().applyCloudState({ books: [{ ...cloudBook, title: "Güncel" }] });
    expect(state().books.filter((b) => b.id === "cloud-1")).toHaveLength(1);
    expect(state().books.find((b) => b.id === "cloud-1")?.title).toBe("Güncel");
  });

  it("bulut notları yerel notlarla birleşir, aynı kimlikte bulut kazanır", () => {
    const local = state().addBookNote({ book_id: "b1", word_index: 1, content: "yerel" });
    const cloudOnly: BookNote = {
      id: "33333333-3333-3333-3333-333333333333",
      book_id: "b1",
      word_index: 2,
      content: "bulut",
      created_at: "2026-10-27T00:00:00Z",
    };
    state().applyCloudState({ bookNotes: [cloudOnly, { ...local, content: "bulutta güncel" }] });
    const notes = state().bookNotes;
    expect(notes).toHaveLength(2);
    expect(notes.find((n) => n.id === local.id)?.content).toBe("bulutta güncel");
    expect(notes.some((n) => n.id === cloudOnly.id)).toBe(true);
  });

  it("boş bulut verisi yerel durumu korur", () => {
    const note = state().addBookNote({ book_id: "b1", word_index: 1, content: "x" });
    state().applyCloudState({});
    expect(state().bookNotes).toEqual([note]);
  });
});

describe("persist migrasyonu (v3)", () => {
  const migrate = (persisted: unknown) =>
    useOkurLabStore.persist.getOptions().migrate!(persisted, 2) as Record<string, unknown>;

  it("sürüm 4'tür", () => {
    expect(useOkurLabStore.persist.getOptions().version).toBe(4);
  });

  it("eski sürümden gelen kişiyi ilk kez gelen biri saymaz", () => {
    expect(migrate({ theme: "dark" }).onboardingDone).toBe(true);
  });

  it("yerel sahte topluluk verisini atar", () => {
    const out = migrate({
      communityReviews: [{ id: "rev-1" }],
      communityQuotes: [{ id: "quote-1" }],
      communityMarginalia: [{ id: "marg-1" }],
      theme: "dark",
    });
    expect(out).not.toHaveProperty("communityReviews");
    expect(out).not.toHaveProperty("communityQuotes");
    expect(out).not.toHaveProperty("communityMarginalia");
    expect(out.theme).toBe("dark");
  });

  it("örnek notu siler, eski kimlikleri uuid'e çevirir, uuid olanı korur", () => {
    const keep = "44444444-4444-4444-4444-444444444444";
    const out = migrate({
      bookNotes: [
        { id: "note-initial-1", book_id: "b", word_index: 0, content: "tohum", created_at: "t" },
        { id: "note-1730000000000", book_id: "b", word_index: 1, content: "eski", created_at: "t" },
        { id: keep, book_id: "b", word_index: 2, content: "yeni", created_at: "t" },
      ],
    });
    const notes = out.bookNotes as BookNote[];
    expect(notes).toHaveLength(2);
    expect(notes.every((n) => isUuid(n.id))).toBe(true);
    expect(notes.some((n) => n.id === keep)).toBe(true);
    expect(notes.some((n) => n.content === "tohum")).toBe(false);
  });

  it("kayıtlı hesap anlık görüntülerindeki notları da yükseltir", () => {
    const out = migrate({
      savedAccounts: {
        "a@x.com": { bookNotes: [{ id: "note-1", book_id: "b", word_index: 0, content: "x", created_at: "t" }] },
        "b@x.com": {},
      },
    });
    const saved = out.savedAccounts as Record<string, { bookNotes: BookNote[] }>;
    expect(isUuid(saved["a@x.com"].bookNotes[0].id)).toBe(true);
    expect(saved["b@x.com"].bookNotes).toEqual([]);
  });

  it("boş veya bozuk veriyle çökmez", () => {
    expect(() => migrate(undefined)).not.toThrow();
    expect(() => migrate({ bookNotes: "bozuk" })).not.toThrow();
  });
});
