"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Browser Supabase client. Returns `null` when Supabase is not configured so
 * the app can fall back to guest/local mode without crashing.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  cached = isSupabaseConfigured
    ? createBrowserClient(env.supabaseUrl, env.supabaseAnonKey)
    : null;
  return cached;
}
