// Single source of truth for "the user's store" — guarantees a row in
// sme_stores exists for any signed-in user before reads/writes/uploads.
// Used by StorefrontBuilder, OnlineStorefront, Products, Services, OfferFormModal.

import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { slugify } from "@/lib/slug";

export interface StoreRow {
  id: number;
  owner_user_id: string | null;
  brand_name: string | null;
  description: string | null;
  banner_url: string | null;
  logo_url: string | null;
  whatsapp_number: string | null;
  business_type: string | null;
  store_slug: string | null;
  prepaid_credits?: number | null;
  message_debt?: number | null;
}

const STORES = "sme_stores";

/**
 * Find or create the sme_stores row for the given authenticated user.
 * Never throws "Store not found" — always returns a usable row (or null
 * only when no user is signed in or the DB is unreachable).
 */
export async function ensureStore(user: User | null | undefined): Promise<StoreRow | null> {
  if (!user) return null;

  // 1) Try to fetch an existing store
  const { data: existing, error: fetchErr } = await supabase
    .from(STORES)
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (existing) return existing as unknown as StoreRow;
  if (fetchErr && fetchErr.code !== "PGRST116") {
    // Unexpected read failure — surface but don't blow up the UI
    console.warn("[ensureStore] fetch error:", fetchErr.message);
  }

  // 2) Build a defaulted row — pull a sensible brand name from auth metadata
  const meta: any = (user as any).user_metadata || {};
  const brandSeed: string =
    meta.full_name || meta.name || (user.email?.split("@")[0] ?? "My Store");
  const seedSlug = slugify(brandSeed) || `store-${user.id.slice(0, 8)}`;
  const slug = await reserveUniqueSlug(seedSlug);

  const insertPayload = {
    owner_user_id: user.id,
    brand_name: brandSeed,
    store_slug: slug,
    business_type: meta.business_type || null,
  } as any;

  const { data: created, error: insErr } = await (supabase
    .from(STORES) as any)
    .insert(insertPayload)
    .select("*")
    .maybeSingle();

  if (created) return created as unknown as StoreRow;

  // 3) Race condition fallback — another tab/request may have just inserted
  if (insErr) {
    const { data: retry } = await supabase
      .from(STORES)
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (retry) return retry as unknown as StoreRow;
    console.error("[ensureStore] could not create store:", insErr.message);
  }
  return null;
}

/**
 * UPSERT-style save — guarantees the store exists, then writes the patch.
 * If a slug collision occurs, automatically appends -2, -3 … until unique.
 */
export async function saveStore(
  user: User | null | undefined,
  patch: Partial<StoreRow>
): Promise<{ store: StoreRow | null; error?: string }> {
  const store = await ensureStore(user);
  if (!store) return { store: null, error: "Sign in to save your store." };

  // Reserve a unique slug if the user changed it
  const next = { ...patch } as any;
  if (typeof next.store_slug === "string" && next.store_slug) {
    next.store_slug = await reserveUniqueSlug(slugify(next.store_slug), store.id);
  }

  const { data, error } = await (supabase
    .from(STORES) as any)
    .update(next)
    .eq("id", store.id)
    .select("*")
    .maybeSingle();

  if (error) return { store, error: error.message };
  return { store: (data as unknown as StoreRow) || store };
}

/**
 * Find a slug not already used by another store. If the seed is taken,
 * append `-2`, `-3` … skipping the row owned by ignoreId (so resaving
 * the same slug for the same store is a no-op).
 */
export async function reserveUniqueSlug(seed: string, ignoreId?: number): Promise<string> {
  const base = slugify(seed) || "store";
  let candidate = base;
  let n = 1;

  // Up to 25 tries — far beyond realistic collisions.
  for (let i = 0; i < 25; i++) {
    const { data } = await (supabase
      .from(STORES) as any)
      .select("id")
      .eq("store_slug", candidate)
      .maybeSingle();
    if (!data || (ignoreId && (data as any).id === ignoreId)) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  // Fall back to a timestamp suffix as a last resort
  return `${base}-${Date.now().toString(36)}`;
}
