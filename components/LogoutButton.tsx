"use client";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/auth/signout", { method: "POST", credentials: "same-origin" });
    } catch {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:bg-white/5"
    >
      退出
    </button>
  );
}
