import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server Supabase client bound to the request cookies (App Router / RSC).
 * Returns `null` when Supabase is not configured. Use this in Server
 * Components, Route Handlers, and Server Actions. For privileged writes use a
 * service-role client inside Edge Functions only — never expose it here.
 */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component without a writable cookie store.
        }
      },
    },
  });
}
