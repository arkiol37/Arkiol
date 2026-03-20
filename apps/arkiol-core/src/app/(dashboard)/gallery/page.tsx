// src/app/(dashboard)/gallery/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { GalleryView }      from "../../../components/dashboard/GalleryView";

export default async function GalleryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <GalleryView />;
}
