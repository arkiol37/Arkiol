// src/app/(dashboard)/admin/page.tsx
// Admin & Ops dashboard — only accessible to ADMIN and SUPER_ADMIN roles.
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { AdminOpsDashboard } from "../../../components/dashboard/AdminOpsDashboard";

export const metadata = { title: "Admin Dashboard — Arkiol" };

const ALLOWED_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  if (!ALLOWED_ROLES.has(user.role)) redirect("/dashboard");

  return <AdminOpsDashboard />;
}
