// src/app/(dashboard)/editor/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "../../../lib/auth";
import { redirect }         from "next/navigation";
import { EditorShell }      from "../../../components/dashboard/EditorShell";

export default async function EditorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <EditorShell />;
}
