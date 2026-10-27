export type Plan = "free" | "pro";

/**
 * Arayüz tarafı Pro denetimi. Plan, Supabase `users.plan` sütunundan gelir ve yalnızca
 * sunucu/yönetici tarafından değiştirilebilir; bu fonksiyon yalnızca ekranı kilitler.
 * Gerçek yetki kontrolü API'de yapılır (bkz. serverPlan.ts).
 */
export function isPro(user: { plan?: Plan } | null | undefined): boolean {
  return user?.plan === "pro";
}
