"use client";

import { SerwistProvider } from "@serwist/next/react";

/**
 * Registers the service worker for the whole origin so installability checks
 * (manifest scope + controlling SW) pass across shell routes.
 */
export function SerwistRoot({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      register
      cacheOnNavigation={false}
      reloadOnOnline={false}
    >
      {children}
    </SerwistProvider>
  );
}
