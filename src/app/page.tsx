import type { Metadata } from "next";

import { headers } from "next/headers";

import { LandingPage } from "@/features/marketing/landing-page";
import {
  PAGE_DESCRIPTION,
  PAGE_KEYWORDS,
  PAGE_TITLE,
  buildHomeJsonLd,
  getLogoImage,
  getOgImage,
} from "@/features/marketing/seo";
import { auth } from "@/infrastructure/auth/server";
import { APP_NAME } from "@/shared/pwa/constants";
import { getSiteUrl } from "@/shared/site";

const siteUrl = getSiteUrl();
const OG_IMAGE = getOgImage(siteUrl);
const LOGO_IMAGE = getLogoImage(siteUrl);

export const metadata: Metadata = {
  title: {
    absolute: PAGE_TITLE,
  },
  description: PAGE_DESCRIPTION,
  keywords: PAGE_KEYWORDS,
  authors: [{ name: APP_NAME, url: siteUrl }],
  creator: APP_NAME,
  publisher: APP_NAME,
  category: "health",
  applicationName: APP_NAME,
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: siteUrl,
    siteName: APP_NAME,
    locale: "en_US",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE.url,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  alternates: { canonical: siteUrl },
  other: {
    "og:logo": LOGO_IMAGE.url,
    "og:image:alt": OG_IMAGE.alt,
  },
};

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildHomeJsonLd(siteUrl)) }}
      />
      <LandingPage authenticated={Boolean(session?.user?.id)} />
    </>
  );
}
