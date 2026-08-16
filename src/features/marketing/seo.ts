import { APP_NAME } from "@/shared/pwa/constants";
import { getSiteUrl } from "@/shared/site";

export const PAGE_TITLE = "Epic Gains — Master YouTube workouts into a collection you own";

export const PAGE_DESCRIPTION =
  "Epic Gains turns YouTube workout videos into sessions you can follow, log, and master. Connect an AI agent over MCP for a daily pulse from your sets and comments. Free forever — no credit card.";

export const PAGE_KEYWORDS = [
  "YouTube workout tracker",
  "workout journal",
  "master YouTube workouts",
  "workout collection app",
  "fitness PWA",
  "exercise log",
  "MCP fitness agent",
  "YouTube workout importer",
  "strength training journal",
  "Epic Gains",
];

export const FEATURE_LIST = [
  "Import YouTube videos into timed, followable workouts",
  "Log sets and mark sessions mastered",
  "Build a personal collection instead of a Watch Later pile",
  "Private showcase with request-based follows",
  "MCP server for AI agents to analyse logs and comments",
  "Installable PWA — free forever, no paid tier",
] as const;

export const faqs = [
  {
    q: "How do I bring a YouTube workout in?",
    a: "Paste the video URL on import. Epic Gains turns the session into a structured workout — exercises, timestamps, and a page you can actually follow.",
  },
  {
    q: "Is Epic Gains free?",
    a: "Yes — free forever. Create an account and start collecting videos. No credit card, no trial, no paid tier waiting in the wings.",
  },
  {
    q: "What does “mastered” mean?",
    a: "You imported the video, followed the work, and logged the session. It is no longer something you watched once — it lives in your collection.",
  },
  {
    q: "Can friends see my collection?",
    a: "Only if you connect. Follows are request-based. Your showcase is for people you train with — not a public leaderboard.",
  },
  {
    q: "What is MCP?",
    a: "Connect Cursor, Gemini, or another agent to Epic Gains as an MCP server. It analyses your workout log history and exercise comments — so a daily pulse cites what you actually did and wrote, not a guess.",
  },
];

const LOGO_PATH = "/logos/logo.png";
const OG_PATH = "/social-preview.jpg";

export function getLogoImage(siteUrl = getSiteUrl()) {
  return {
    url: `${siteUrl}${LOGO_PATH}`,
    width: 1024,
    height: 1024,
    type: "image/png",
    alt: `${APP_NAME} logo — master YouTube workouts into a collection you own`,
  } as const;
}

export function getOgImage(siteUrl = getSiteUrl()) {
  return {
    url: `${siteUrl}${OG_PATH}`,
    secureUrl: `${siteUrl}${OG_PATH}`,
    width: 1200,
    height: 630,
    type: "image/jpeg",
    alt: "Epic Gains app: import YouTube workouts, log sessions, and grow a collection you own.",
  } as const;
}

export function buildHomeJsonLd(siteUrl = getSiteUrl()) {
  const logo = getLogoImage(siteUrl);
  const og = getOgImage(siteUrl);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: APP_NAME,
        legalName: APP_NAME,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          "@id": `${siteUrl}/#logo`,
          url: logo.url,
          contentUrl: logo.url,
          width: logo.width,
          height: logo.height,
          caption: APP_NAME,
        },
        image: { "@id": `${siteUrl}/#logo` },
        description: PAGE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: APP_NAME,
        description: PAGE_DESCRIPTION,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "ImageObject",
        "@id": `${siteUrl}/#social-preview`,
        url: og.url,
        contentUrl: og.url,
        width: og.width,
        height: og.height,
        caption: og.alt,
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#software` },
        primaryImageOfPage: { "@id": `${siteUrl}/#social-preview` },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: siteUrl,
            },
          ],
        },
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["h1", "section#faq"],
        },
        inLanguage: "en-US",
      },
      {
        "@type": ["SoftwareApplication", "Product"],
        "@id": `${siteUrl}/#software`,
        name: APP_NAME,
        applicationCategory: "HealthApplication",
        applicationSubCategory: "Fitness",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript and a modern browser",
        description: PAGE_DESCRIPTION,
        url: siteUrl,
        image: og.url,
        logo: logo.url,
        screenshot: og.url,
        featureList: [...FEATURE_LIST],
        audience: {
          "@type": "Audience",
          audienceType:
            "People who train from YouTube videos and want a journal they own",
        },
        brand: {
          "@type": "Brand",
          name: APP_NAME,
          logo: logo.url,
        },
        offers: {
          "@type": "Offer",
          name: "Free",
          category: "Free",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: `${siteUrl}/sign-up`,
          description: "Free forever. No credit card, no trial.",
        },
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "HowTo",
        "@id": `${siteUrl}/#howto`,
        name: "How to master YouTube workouts with Epic Gains",
        description:
          "Import a YouTube video, follow the timed session, log your work, and grow a collection you can show training partners.",
        image: og.url,
        totalTime: "PT10M",
        estimatedCost: {
          "@type": "MonetaryAmount",
          currency: "USD",
          value: "0",
        },
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Paste a YouTube link",
            text: "Import the video. Epic Gains turns it into timed exercises you can follow instead of scrubbing a 40-minute blob.",
            url: `${siteUrl}/#how-it-works`,
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Follow along and log the session",
            text: "Run the workout, log your sets, and mark it mastered so it lives in your collection.",
            url: `${siteUrl}/#how-it-works`,
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Showcase privately",
            text: "Follows are request-based. Share the collection with people you train with — not a public leaderboard.",
            url: `${siteUrl}/#how-it-works`,
          },
          {
            "@type": "HowToStep",
            position: 4,
            name: "Connect an agent for a daily pulse",
            text: "Point Cursor, Gemini, or another MCP client at Epic Gains. The pulse cites your log history and comments.",
            url: `${siteUrl}/#how-it-works`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}
