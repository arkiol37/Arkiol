// src/app/(auth)/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions }      from "../../lib/auth";
import { redirect }         from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In — Arkiol",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If already signed in, redirect to dashboard
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
