// src/app/(dashboard)/brand/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { BrandKitView }     from "../../../components/dashboard/BrandKitView";

export default async function BrandPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <BrandKitView />;
}
