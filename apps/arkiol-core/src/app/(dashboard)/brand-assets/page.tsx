// src/app/(dashboard)/brand-assets/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { BrandAssetView }   from "../../../components/dashboard/BrandAssetView";

export const metadata = {
  title: "Brand Asset Library — Arkiol",
  description: "Upload and manage brand assets for AI-powered 2D ad generation",
};

export default async function BrandAssetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <BrandAssetView />;
}
