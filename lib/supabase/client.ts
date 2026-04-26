import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_DEV_PLACEHOLDER_ANON_KEY, SUPABASE_DEV_PLACEHOLDER_URL } from "@/lib/supabase/env";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || SUPABASE_DEV_PLACEHOLDER_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || SUPABASE_DEV_PLACEHOLDER_ANON_KEY;

  return createBrowserClient(url, anon);
}
