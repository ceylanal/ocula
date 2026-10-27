import { describe, expect, it } from "vitest";
import { verifyProAccess } from "./serverPlan";
import { isPro } from "./plan";

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co/",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  NODE_ENV: "production",
};

const req = (token?: string) =>
  new Request("https://okurlab.test/api/generate-questions", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

/** Supabase'i taklit eder: jeton → kullanıcı, kullanıcı → plan. */
function fakeSupabase(opts: { userOk?: boolean; plan?: string | null; planOk?: boolean } = {}) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers || {}) as Record<string, string> });
    if (url.endsWith("/auth/v1/user")) {
      return opts.userOk === false
        ? new Response("{}", { status: 401 })
        : new Response(JSON.stringify({ id: "11111111-1111-1111-1111-111111111111" }), { status: 200 });
    }
    if (url.includes("/rest/v1/users")) {
      if (opts.planOk === false) return new Response("{}", { status: 500 });
      const rows = opts.plan === null ? [] : [{ plan: opts.plan ?? "free" }];
      return new Response(JSON.stringify(rows), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { impl, calls };
}

describe("verifyProAccess", () => {
  it("jeton yoksa 401 döner", async () => {
    const { impl } = fakeSupabase();
    expect(await verifyProAccess(req(), ENV, impl)).toMatchObject({ ok: false, status: 401 });
  });

  it("Pro kullanıcıyı kabul eder ve kullanıcının kendi jetonuyla sorgular", async () => {
    const { impl, calls } = fakeSupabase({ plan: "pro" });
    const res = await verifyProAccess(req("tok"), ENV, impl);
    expect(res).toEqual({ ok: true, userId: "11111111-1111-1111-1111-111111111111" });
    expect(calls[0].url).toBe("https://proj.supabase.co/auth/v1/user");
    expect(calls[1].url).toContain("/rest/v1/users?id=eq.11111111");
    expect(calls[1].headers.Authorization).toBe("Bearer tok");
    expect(calls[1].headers.apikey).toBe("anon");
  });

  it("free kullanıcıyı 402 ile reddeder", async () => {
    const { impl } = fakeSupabase({ plan: "free" });
    expect(await verifyProAccess(req("tok"), ENV, impl)).toMatchObject({ ok: false, status: 402 });
  });

  it("kullanıcı satırı yoksa Pro saymaz", async () => {
    const { impl } = fakeSupabase({ plan: null });
    expect(await verifyProAccess(req("tok"), ENV, impl)).toMatchObject({ ok: false, status: 402 });
  });

  it("geçersiz jetonu 401 ile reddeder", async () => {
    const { impl } = fakeSupabase({ userOk: false });
    expect(await verifyProAccess(req("kötü"), ENV, impl)).toMatchObject({ ok: false, status: 401 });
  });

  it("Supabase yapılandırılmamışsa kapalı kalır (503)", async () => {
    const { impl } = fakeSupabase({ plan: "pro" });
    expect(
      await verifyProAccess(req("tok"), { NODE_ENV: "production" }, impl)
    ).toMatchObject({ ok: false, status: 503 });
  });

  it("plan okunamazsa ya da ağ düşerse Pro vermez", async () => {
    expect(
      await verifyProAccess(req("tok"), ENV, fakeSupabase({ planOk: false }).impl)
    ).toMatchObject({ ok: false, status: 503 });
    const broken = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await verifyProAccess(req("tok"), ENV, broken)).toMatchObject({ ok: false, status: 503 });
  });

  it("geliştirme atlatması üretimde çalışmaz", async () => {
    const { impl } = fakeSupabase({ plan: "free" });
    expect(await verifyProAccess(req(), { ...ENV, NODE_ENV: "development", OKURLAB_DEV_PRO: "1" }, impl)).toMatchObject({ ok: true });
    expect(await verifyProAccess(req(), { ...ENV, NODE_ENV: "production", OKURLAB_DEV_PRO: "1" }, impl)).toMatchObject({ ok: false, status: 401 });
  });
});

describe("isPro", () => {
  it("yalnızca plan 'pro' ise doğrudur", () => {
    expect(isPro({ plan: "pro" })).toBe(true);
    expect(isPro({ plan: "free" })).toBe(false);
    expect(isPro({})).toBe(false);
    expect(isPro(null)).toBe(false);
  });
});
