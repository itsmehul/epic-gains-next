import { headers } from "next/headers";

import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";
import { auth } from "@/infrastructure/auth/server";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return <DashboardPageClient userName={session?.user.name ?? "there"} />;
}
