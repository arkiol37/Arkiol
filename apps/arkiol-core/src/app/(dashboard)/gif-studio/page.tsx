// src/app/(dashboard)/gif-studio/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { GifStudioView }    from "../../../components/dashboard/GifStudioView";

export const metadata = {
  title: "Arkiol Studio — ARKIOL",
  description: "Create motion-ready animated GIFs for social media.",
};

export default async function GifStudioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <GifStudioView />;
}
