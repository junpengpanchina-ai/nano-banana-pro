import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { readAdminSession } from "@/lib/admin-session";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const sess = await readAdminSession();
  if (!sess) redirect("/admin/login?next=/admin");
  return <AdminShell operatorEmail={sess.username}>{children}</AdminShell>;
}
