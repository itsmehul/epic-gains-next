import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Shown for document requests when the network is unavailable (Serwist fallback in `sw.ts`).
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">You are offline</h1>
      <p className="mt-2 text-muted-foreground">
        Cached pages may still be available. Reconnect to sync the latest data.
      </p>
      <p className="mt-4">
        <Link href="/" className="underline underline-offset-4">
          Back home
        </Link>
      </p>
    </main>
  );
}
