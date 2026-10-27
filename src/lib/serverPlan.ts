/**
 * Sunucu tarafı Pro doğrulaması. İstemcinin gönderdiği Supabase erişim jetonunu Supabase'e
 * sorarak doğrular ve `users.plan` değerini RLS altında (kullanıcının kendi jetonuyla) okur.
 * İstemci bu değeri değiştiremez; plan yalnızca service_role ile atanır.
 */

export type ProCheck =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 402 | 503; error: string };

interface ProCheckEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NODE_ENV?: string;
  /** Yalnızca geliştirmede: "1" ise Pro denetimi atlanır. */
  OKURLAB_DEV_PRO?: string;
}

export async function verifyProAccess(
  request: Request,
  env: ProCheckEnv = process.env as ProCheckEnv,
  fetchImpl: typeof fetch = fetch
): Promise<ProCheck> {
  if (env.NODE_ENV !== "production" && env.OKURLAB_DEV_PRO === "1") {
    return { ok: true, userId: "dev" };
  }

  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token) {
    return { ok: false, status: 401, error: "Bu özellik için Pro hesabınla giriş yapmalısın." };
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Doğrulama yapılamıyorsa kapalı kal: kilidi açık bırakmaktan iyidir.
    return { ok: false, status: 503, error: "Pro doğrulaması şu an yapılandırılmamış." };
  }

  const headers = { apikey: anon, Authorization: `Bearer ${token}` };

  try {
    const userRes = await fetchImpl(`${url}/auth/v1/user`, { headers });
    if (!userRes.ok) {
      return { ok: false, status: 401, error: "Oturumun geçersiz. Yeniden giriş yap." };
    }
    const user = (await userRes.json()) as { id?: string };
    if (!user.id) {
      return { ok: false, status: 401, error: "Oturumun geçersiz. Yeniden giriş yap." };
    }

    const planRes = await fetchImpl(
      `${url}/rest/v1/users?id=eq.${encodeURIComponent(user.id)}&select=plan`,
      { headers }
    );
    if (!planRes.ok) {
      return { ok: false, status: 503, error: "Plan bilgisi okunamadı. Biraz sonra tekrar dene." };
    }
    const rows = (await planRes.json()) as { plan?: string }[];
    if (rows[0]?.plan !== "pro") {
      return { ok: false, status: 402, error: "Bu özellik Pro hesaplara açık." };
    }
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, status: 503, error: "Pro doğrulaması şu an yapılamıyor." };
  }
}
