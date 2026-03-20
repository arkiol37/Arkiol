// src/app/(dashboard)/settings/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { SettingsView }     from "../../../components/dashboard/SettingsView";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  return <SettingsView user={{ id: user.id, email: user.email, name: user.name, role: user.role }} />;
}
