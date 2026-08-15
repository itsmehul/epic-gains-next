import type { Metadata } from "next";

import { LandingPage } from "@/features/marketing/landing-page";
import { APP_NAME } from "@/shared/pwa/constants";

export const metadata: Metadata = {
  title: `Workout journal for strength training · ${APP_NAME}`,
  description:
    "Log every set, see your progress, and train more consistently. Epic Gains is a simple strength journal — free to start.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingPage />;
}
