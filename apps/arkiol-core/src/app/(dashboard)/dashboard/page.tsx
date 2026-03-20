// src/app/(dashboard)/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { DashboardHome }    from "../../../components/dashboard/DashboardHome";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  return (
    <DashboardHome user={{
      id:    user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
      orgId: user.orgId,
    }} />
  );
}
