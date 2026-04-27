import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login?next=/admin");
  }
  const email = user.email;
  if (!email || !isAdminEmail(email)) {
    redirect("/dashboard");
  }
  return <AdminShell operatorEmail={email}>{children}</AdminShell>;
}
