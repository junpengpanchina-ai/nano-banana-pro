import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_DEV_PLACEHOLDER_ANON_KEY, SUPABASE_DEV_PLACEHOLDER_URL } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || SUPABASE_DEV_PLACEHOLDER_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || SUPABASE_DEV_PLACEHOLDER_ANON_KEY;

  return createServerClient(url, anon, {
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
          // Called from a Server Component without mutable cookies; safe to ignore.
        }
      },
    },
  });
}
