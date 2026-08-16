import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import type { AccountSidebarProfile } from "@/components/layout/app-sidebar";
import { auth } from "@/infrastructure/auth/server";

function ShellLayoutFallback() {
  return (
    <div className="flex h-dvh">
      <div className="hidden w-72 shrink-0 border-r bg-sidebar md:block" />
      <main className="flex min-h-0 flex-1 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </main>
    </div>
  );
}

export default function ShellLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense fallback={<ShellLayoutFallback />}>
      <ShellLayoutContent>{children}</ShellLayoutContent>
    </Suspense>
  );
}

async function ShellLayoutContent({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { ensureUserSocialProfile } = await import(
    "@/db/repositories/social.repository"
  );
  const profile = await ensureUserSocialProfile(session.user.id);

  const accountProfile: AccountSidebarProfile = {
    name: session.user.name || "Account",
    pictureUrl: profile?.image?.trim() || session.user.image?.trim() || null,
  };

  return <AppShell accountProfile={accountProfile}>{children}</AppShell>;
}
