// src/app/(dashboard)/campaigns/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { CampaignsView }    from "../../../components/dashboard/CampaignsView";

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <CampaignsView />;
}
