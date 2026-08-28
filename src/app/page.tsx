import type { Metadata } from "next";

import { headers } from "next/headers";

import {
  getAudienceCopy,
  parseAudience,
} from "@/features/marketing/audiences";
import { LandingPage } from "@/features/marketing/landing-page";
import {
  PAGE_KEYWORDS,
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

type HomeSearchParams = Promise<{ audience?: string | string[] }>;

function audienceFromSearchParams(
  searchParams: { audience?: string | string[] },
) {
  const raw = searchParams.audience;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseAudience(value);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}): Promise<Metadata> {
  const audience = audienceFromSearchParams(await searchParams);
  const copy = getAudienceCopy(audience);

  return {
    title: {
      absolute: copy.metaTitle,
    },
    description: copy.metaDescription,
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
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: siteUrl,
      siteName: APP_NAME,
      locale: "en_US",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.metaTitle,
      description: copy.metaDescription,
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
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}) {
  const audience = audienceFromSearchParams(await searchParams);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildHomeJsonLd(siteUrl)) }}
      />
      <LandingPage
        authenticated={Boolean(session?.user?.id)}
        audience={audience}
      />
    </>
  );
}
