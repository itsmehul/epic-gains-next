import type { Metadata } from "next";

import { LandingPage } from "@/features/marketing/landing-page";
import { APP_NAME } from "@/shared/pwa/constants";

export const metadata: Metadata = {
  title: `Master YouTube workouts · ${APP_NAME}`,
  description:
    "Master YouTube workouts into a collection you own. Connect an AI agent over MCP for a daily pulse from your exercise comments. Free to start.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingPage />;
}
