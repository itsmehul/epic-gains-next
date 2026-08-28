import type { ComponentType } from "react";

import {
  IconBrain,
  IconBrandYoutube,
  IconStack2,
  IconTrophy,
  IconUsers,
} from "@/components/ui/icons";

import { faqs as defaultFaqs, PAGE_DESCRIPTION, PAGE_TITLE } from "./seo";

const AUDIENCE_IDS = [
  "home-gym",
  "rehab",
  "train-like",
  "creators",
  "coaches",
] as const;

export type AudienceId = (typeof AUDIENCE_IDS)[number];

type FaqItem = { q: string; a: string };

type BeatItem = {
  icon: ComponentType<{ className?: string; stroke?: number }>;
  kicker: string;
  title: string;
  body: string;
  pattern: string;
};

type AudienceCopy = {
  id: AudienceId | null;
  heroHeadline: string;
  /** When true, render the YouTube icon between “Master” and the rest (default only). */
  heroShowsYoutubeIcon: boolean;
  heroSub: string;
  heroCta: string;
  heroSecondaryCta: string;
  freeNote: string;
  showcaseChapter: string;
  showcaseHeadline: string;
  pulseChapter: string;
  pulseHeadline: string;
  pulseSub: string;
  pathChapter: string;
  pathHeadline: string;
  pathSub: string;
  beats: BeatItem[];
  closingHeadline: string;
  closingSub: string;
  closingCta: string;
  faqs: FaqItem[];
  footerTagline: string;
  metaTitle: string;
  metaDescription: string;
  /** Short label for footer audience links */
  navLabel: string;
};

const beatIcons = {
  import: IconBrandYoutube,
  master: IconTrophy,
  collect: IconStack2,
  showcase: IconUsers,
  pulse: IconBrain,
} as const;

function beats(
  items: Array<{
    key: keyof typeof beatIcons;
    kicker: string;
    title: string;
    body: string;
    pattern: "pattern-dots" | "pattern-graph";
  }>,
): BeatItem[] {
  return items.map((item) => ({
    icon: beatIcons[item.key],
    kicker: item.kicker,
    title: item.title,
    body: item.body,
    pattern: item.pattern,
  }));
}

const defaultBeats = beats([
  {
    key: "import",
    kicker: "Import",
    title: "Every video becomes a workout you can follow.",
    body: "Paste the link. Get timed exercises instead of a 40-minute blob you have to scrub through again.",
    pattern: "pattern-dots",
  },
  {
    key: "master",
    kicker: "Master",
    title: "Finish it. Own it. Mark it mastered.",
    body: "The session is not a view count. It is a page in your collection with the work you actually did.",
    pattern: "pattern-graph",
  },
  {
    key: "collect",
    kicker: "Collect",
    title: "A legendary library, not a Watch Later graveyard.",
    body: "Push, pull, yoga, HIIT — filed as workouts you can run again, not videos you forgot you liked.",
    pattern: "pattern-dots",
  },
  {
    key: "showcase",
    kicker: "Showcase",
    title: "Show the collection to people who train with you.",
    body: "A private feed of mastered sessions. Request-based follows. No public leaderboard.",
    pattern: "pattern-graph",
  },
  {
    key: "pulse",
    kicker: "Pulse",
    title: "Your agent analyses log history and comments.",
    body: "It reads your set history and the notes you left. When ROM stalls, the pulse is a plan — not a pep talk.",
    pattern: "pattern-dots",
  },
]);

const DEFAULT_AUDIENCE_COPY: AudienceCopy = {
  id: null,
  heroHeadline: "Master workouts and build an epic collection",
  heroShowsYoutubeIcon: true,
  heroSub:
    "Paste a link, get timed exercises, and log the session so it lives in your collection — not Watch Later.",
  heroCta: "Start your collection",
  heroSecondaryCta: "Sign in",
  freeNote: "No credit card. No trial clock. Free forever.",
  showcaseChapter: "Master & showcase",
  showcaseHeadline: "Finish the video. File it. Let the collection speak.",
  pulseChapter: "Daily pulse · MCP",
  pulseHeadline:
    "Connect your favourite AI agent. Let it analyse log history and comments.",
  pulseSub: "Your sets and notes — or someone you follow, once they accept.",
  pathChapter: "The path",
  pathHeadline: "From a link on YouTube to a library that talks back",
  pathSub: "Import. Master. Collect. Showcase. Pulse. That is the whole plot.",
  beats: defaultBeats,
  closingHeadline: "Pick a video. Master it. Grow the collection.",
  closingSub:
    "Free forever. Works as a PWA on your phone. Import from YouTube, follow along, and connect an agent over MCP for a daily pulse on the journey.",
  closingCta: "Start collecting",
  faqs: defaultFaqs,
  footerTagline: "Master the video. Keep the collection.",
  metaTitle: PAGE_TITLE,
  metaDescription: PAGE_DESCRIPTION,
  navLabel: "Default",
};

const homeGym: AudienceCopy = {
  id: "home-gym",
  heroHeadline: "Turn YouTube sessions into workouts you actually run again",
  heroShowsYoutubeIcon: false,
  heroSub:
    "Stop scrubbing a 40-minute video in the garage. Paste the link, get timed blocks, and log the session so it is not stuck in Watch Later.",
  heroCta: "Build your home library",
  heroSecondaryCta: "Sign in",
  freeNote: "No credit card. No trial clock. Free forever.",
  showcaseChapter: "Master & showcase",
  showcaseHeadline: "Finish the session. File it. Run it next week without the search.",
  pulseChapter: "Daily pulse · MCP",
  pulseHeadline:
    "Ask your agent what you actually lifted — not what you meant to watch.",
  pulseSub: "Sets, notes, and comments from the rack — or a training partner you follow.",
  pathChapter: "The path",
  pathHeadline: "From a saved video to a session you can repeat",
  pathSub: "Import. Master. Collect. Showcase. Pulse. Same product, built for the garage.",
  beats: beats([
    {
      key: "import",
      kicker: "Import",
      title: "Every video becomes timed blocks, not a blob.",
      body: "Paste the link. Jump to the work sets instead of scrubbing through the intro again.",
      pattern: "pattern-dots",
    },
    {
      key: "master",
      kicker: "Master",
      title: "Log the session. Mark it mastered.",
      body: "A view count is not a workout. Your collection remembers what you actually did.",
      pattern: "pattern-graph",
    },
    {
      key: "collect",
      kicker: "Collect",
      title: "A library for the rack — not Watch Later.",
      body: "Push, pull, HIIT, mobility — filed as workouts you can run again when the playlist fails you.",
      pattern: "pattern-dots",
    },
    {
      key: "showcase",
      kicker: "Showcase",
      title: "Show training partners what you finished.",
      body: "Request-based follows. A private feed of mastered sessions — no public leaderboard.",
      pattern: "pattern-graph",
    },
    {
      key: "pulse",
      kicker: "Pulse",
      title: "Your agent reads the log, not the vibe.",
      body: "History and comments in plain language — when progress stalls, the pulse is a plan.",
      pattern: "pattern-dots",
    },
  ]),
  closingHeadline: "Pick a video. Run it like a real session.",
  closingSub:
    "Free forever. PWA on your phone. Import from YouTube, follow the timestamps, and let an agent pulse your home-gym log.",
  closingCta: "Start your library",
  faqs: [
    {
      q: "Does this replace my spreadsheet?",
      a: "It sits beside it. Epic Gains turns the YouTube session into timed exercises you can follow and log — so the video is not the only record of what you did.",
    },
    {
      q: "Is Epic Gains free?",
      a: "Yes — free forever. No credit card, no trial, no paid tier waiting in the wings.",
    },
    {
      q: "What does “mastered” mean?",
      a: "You imported the video, followed the work, and logged the session. It lives in your collection instead of Watch Later.",
    },
    {
      q: "Can friends see my collection?",
      a: "Only if you connect. Follows are request-based — for people you train with, not a public leaderboard.",
    },
    {
      q: "What is MCP?",
      a: "Connect Cursor, Gemini, or another agent to Epic Gains. It analyses your workout log and exercise comments so a daily pulse cites what you actually did.",
    },
  ],
  footerTagline: "Home gym sessions you can run again.",
  metaTitle: "Epic Gains — Home gym YouTube workouts you can log and repeat",
  metaDescription:
    "Turn garage YouTube sessions into timed workouts. Log sets, master the video, and keep a collection instead of Watch Later. Free forever.",
  navLabel: "Home gym",
};

const rehab: AudienceCopy = {
  id: "rehab",
  heroHeadline: "Jump to the block you need. Log what you actually did.",
  heroShowsYoutubeIcon: false,
  heroSub:
    "PT and mobility videos stop being a black box. Timed sections let you skip the intro, repeat the hip block, and leave notes your agent can read.",
  heroCta: "Structure your home program",
  heroSecondaryCta: "Sign in",
  freeNote: "No credit card. No trial clock. Free forever.",
  showcaseChapter: "Master & showcase",
  showcaseHeadline: "Finish the flow. File it. Repeat the section that matters.",
  pulseChapter: "Daily pulse · MCP",
  pulseHeadline: "ROM notes and comments — not a pep talk.",
  pulseSub: "Your agent cites what you logged and wrote after each block.",
  pathChapter: "The path",
  pathHeadline: "From a prescribed video to a program you can navigate",
  pathSub: "Import. Master. Collect. Showcase. Pulse. Built for home programs.",
  beats: beats([
    {
      key: "import",
      kicker: "Import",
      title: "Chapters for every move in the home program.",
      body: "Paste the link. Seek to the hip or shoulder block without scrubbing the whole tape.",
      pattern: "pattern-dots",
    },
    {
      key: "master",
      kicker: "Master",
      title: "Log the session. Note how it felt.",
      body: "Mastered means you did the work and left a trail — not that you watched once.",
      pattern: "pattern-graph",
    },
    {
      key: "collect",
      kicker: "Collect",
      title: "A library of flows you can reopen.",
      body: "The same mobility or rehab video, filed so next week you go straight to the work.",
      pattern: "pattern-dots",
    },
    {
      key: "showcase",
      kicker: "Showcase",
      title: "Share privately with people in your corner.",
      body: "Request-based follows. Show progress to a coach or partner — not a leaderboard.",
      pattern: "pattern-graph",
    },
    {
      key: "pulse",
      kicker: "Pulse",
      title: "Agent pulse from comments and history.",
      body: "When ROM stalls, the pulse cites your notes — so the next session is specific.",
      pattern: "pattern-dots",
    },
  ]),
  closingHeadline: "Import the program video. Own every block.",
  closingSub:
    "Free forever. Jump to the section you need, log the work, and connect an agent for a pulse grounded in your notes.",
  closingCta: "Start structuring",
  faqs: [
    {
      q: "Can I jump to one section of a long video?",
      a: "Yes. Import turns the video into timed exercises. Seek to the block you need, repeat it, and leave a comment on that move.",
    },
    {
      q: "Is Epic Gains free?",
      a: "Yes — free forever. No credit card, no trial, no paid tier.",
    },
    {
      q: "What does “mastered” mean?",
      a: "You followed the session and logged it. The video becomes a page in your collection you can reopen for the same block next time.",
    },
    {
      q: "Will my clinician see my log?",
      a: "Only if you connect with them. Follows are request-based and private — nothing is a public feed.",
    },
    {
      q: "What is MCP?",
      a: "An AI agent can connect to Epic Gains and read your log history and exercise comments — useful when you want a daily pulse on ROM notes, not generic advice.",
    },
  ],
  footerTagline: "Home programs you can navigate.",
  metaTitle: "Epic Gains — Rehab & mobility videos with timestamps you can log",
  metaDescription:
    "Turn PT and mobility YouTube videos into timed blocks. Skip the intro, repeat a section, log notes, and get an agent pulse. Free forever.",
  navLabel: "Rehab",
};

const trainLike: AudienceCopy = {
  id: "train-like",
  heroHeadline: "The class video is the workout. Follow the timer — not the scrub bar.",
  heroShowsYoutubeIcon: false,
  heroSub:
    "HIIT, yoga, pilates, dance cardio — paste the link, skip the intro, ride the interval grid, and file the class in a collection instead of a playlist.",
  heroCta: "Start following classes",
  heroSecondaryCta: "Sign in",
  freeNote: "No credit card. No trial clock. Free forever.",
  showcaseChapter: "Master & showcase",
  showcaseHeadline: "Finish the class. File it. Build a library of sessions.",
  pulseChapter: "Daily pulse · MCP",
  pulseHeadline: "Let your agent recap the classes you actually finished.",
  pulseSub: "Volume, notes, and comments — or a friend you follow once they accept.",
  pathChapter: "The path",
  pathHeadline: "From a class on YouTube to a collection that talks back",
  pathSub: "Import. Master. Collect. Showcase. Pulse. Built for follow-alongs.",
  beats: beats([
    {
      key: "import",
      kicker: "Import",
      title: "Timed moves aligned to the class clock.",
      body: "Paste the link. Skip the talky intro. Land on the first beep or on-screen timer.",
      pattern: "pattern-dots",
    },
    {
      key: "master",
      kicker: "Master",
      title: "Finish the class. Mark it mastered.",
      body: "A view is not attendance. Logging makes the session real in your collection.",
      pattern: "pattern-graph",
    },
    {
      key: "collect",
      kicker: "Collect",
      title: "Classes you can run again — not a playlist graveyard.",
      body: "Yoga, HIIT, pilates, dance — filed as workouts with timestamps, not videos you liked once.",
      pattern: "pattern-dots",
    },
    {
      key: "showcase",
      kicker: "Showcase",
      title: "Show friends the classes you completed.",
      body: "Private, request-based follows. No public class leaderboard.",
      pattern: "pattern-graph",
    },
    {
      key: "pulse",
      kicker: "Pulse",
      title: "Agent pulse from the sessions you logged.",
      body: "It reads history and comments so the daily recap cites the work — not the watch time.",
      pattern: "pattern-dots",
    },
  ]),
  closingHeadline: "Pick a class. Follow it. Grow the collection.",
  closingSub:
    "Free forever. Import follow-along YouTube classes, ride the timestamps, and connect an agent for a daily pulse.",
  closingCta: "Start collecting classes",
  faqs: [
    {
      q: "How do timestamps work on follow-along videos?",
      a: "Import breaks the class into timed exercises aligned to chapter markers, timers, or beeps — so you can skip intro and jump between moves.",
    },
    {
      q: "Is Epic Gains free?",
      a: "Yes — free forever. No credit card, no trial, no paid tier.",
    },
    {
      q: "What does “mastered” mean?",
      a: "You imported the class, followed along, and logged the session. It lives in your collection instead of a Watch Later pile.",
    },
    {
      q: "Can friends see my collection?",
      a: "Only if you connect. Follows are request-based — for people you train with, not a public leaderboard.",
    },
    {
      q: "What is MCP?",
      a: "Connect an AI agent to Epic Gains. It analyses log history and comments so a daily pulse cites the classes you finished.",
    },
  ],
  footerTagline: "Follow-along classes you can file.",
  metaTitle: "Epic Gains — Follow-along YouTube classes with timed exercises",
  metaDescription:
    "Turn HIIT, yoga, pilates, and dance videos into timed follow-along workouts. Skip the intro, log the class, grow a collection. Free forever.",
  navLabel: "Train-like",
};

const creators: AudienceCopy = {
  id: "creators",
  heroHeadline: "One upload. Chapters viewers can follow and log.",
  heroShowsYoutubeIcon: false,
  heroSub:
    "You already filmed the class. Epic Gains turns that video into a structured session — timed exercises your audience can run again without a PDF rewrite.",
  heroCta: "Turn a video into a session",
  heroSecondaryCta: "Sign in",
  freeNote: "No credit card. No trial clock. Free forever.",
  showcaseChapter: "Master & showcase",
  showcaseHeadline: "Your video becomes a page in someone’s collection.",
  pulseChapter: "Daily pulse · MCP",
  pulseHeadline: "Agents can read what followers logged on your sessions.",
  pulseSub: "Once they connect — private follows, not a public scrape.",
  pathChapter: "The path",
  pathHeadline: "From one YouTube asset to many logged sessions",
  pathSub: "Import. Master. Collect. Showcase. Pulse. Same plot, creator-facing.",
  beats: beats([
    {
      key: "import",
      kicker: "Import",
      title: "Your video becomes timed exercises.",
      body: "Paste the URL. Get start/end markers so viewers follow the moves — not a scrub bar.",
      pattern: "pattern-dots",
    },
    {
      key: "master",
      kicker: "Master",
      title: "Viewers finish and mark it mastered.",
      body: "Completion is a logged session in their collection — stronger than a like.",
      pattern: "pattern-graph",
    },
    {
      key: "collect",
      kicker: "Collect",
      title: "One asset, many replays.",
      body: "No re-edit for a program sheet. The same upload powers structured follow-alongs.",
      pattern: "pattern-dots",
    },
    {
      key: "showcase",
      kicker: "Showcase",
      title: "Private social around who actually trained.",
      body: "Request-based follows. People showcase mastered sessions — not vanity metrics.",
      pattern: "pattern-graph",
    },
    {
      key: "pulse",
      kicker: "Pulse",
      title: "MCP pulse on real session history.",
      body: "Agents analyse logs and comments from people who ran the workout.",
      pattern: "pattern-dots",
    },
  ]),
  closingHeadline: "Ship the video. Let it live as a workout.",
  closingSub:
    "Free forever. Import your YouTube class once. Viewers get timestamps, logs, and a collection — you skip the PDF rewrite.",
  closingCta: "Import your first video",
  faqs: [
    {
      q: "Do I need to re-edit my video?",
      a: "No. Paste the existing URL. Epic Gains structures timed exercises from the session so followers can seek and log without a new cut.",
    },
    {
      q: "Is Epic Gains free?",
      a: "Yes — free forever for you and for viewers who import your video. No credit card, no paid tier.",
    },
    {
      q: "What does “mastered” mean for my audience?",
      a: "They followed the structured session and logged it. Your video becomes a page in their collection they can run again.",
    },
    {
      q: "Is my audience’s data public?",
      a: "No. Follows are request-based. Collections stay private unless someone connects with a training partner.",
    },
    {
      q: "What is MCP?",
      a: "Viewers can connect an AI agent to Epic Gains to analyse their own logs and comments on sessions — including ones built from your videos.",
    },
  ],
  footerTagline: "One video. Many structured sessions.",
  metaTitle: "Epic Gains — Creators: turn YouTube workouts into loggable sessions",
  metaDescription:
    "Fitness creators: turn one YouTube upload into timed exercises viewers can follow, log, and master. No PDF rewrite. Free forever.",
  navLabel: "Creators",
};

const coaches: AudienceCopy = {
  id: "coaches",
  heroHeadline: "Assign a video. Get a structured log — not “I watched it.”",
  heroShowsYoutubeIcon: false,
  heroSub:
    "Send a YouTube (or your own) follow-along. Clients import timed exercises, complete the session, and leave a trail you can discuss — without rebuilding the program by hand.",
  heroCta: "Assign your first session",
  heroSecondaryCta: "Sign in",
  freeNote: "No credit card. No trial clock. Free forever.",
  showcaseChapter: "Master & showcase",
  showcaseHeadline: "Clients finish. Collections show who actually trained.",
  pulseChapter: "Daily pulse · MCP",
  pulseHeadline: "Agents cite client logs and comments — with consent.",
  pulseSub: "Request-based follows. Analyse what they did, not what they claimed.",
  pathChapter: "The path",
  pathHeadline: "From “do this video” to a session you can review",
  pathSub: "Import. Master. Collect. Showcase. Pulse. Built for assigned follow-alongs.",
  beats: beats([
    {
      key: "import",
      kicker: "Import",
      title: "Clients paste the link you sent.",
      body: "The video becomes timed exercises — so homework is a workout, not a vague watch.",
      pattern: "pattern-dots",
    },
    {
      key: "master",
      kicker: "Master",
      title: "Completion is a logged, mastered session.",
      body: "You get proof of work in their collection — not a screenshot of YouTube.",
      pattern: "pattern-graph",
    },
    {
      key: "collect",
      kicker: "Collect",
      title: "A library of assigned sessions they can repeat.",
      body: "Same video next week, same structure — without you rewriting the sheet.",
      pattern: "pattern-dots",
    },
    {
      key: "showcase",
      kicker: "Showcase",
      title: "Private follows between coach and client.",
      body: "Request-based. See the collection of people you train with — no public board.",
      pattern: "pattern-graph",
    },
    {
      key: "pulse",
      kicker: "Pulse",
      title: "MCP pulse on accepted follow logs.",
      body: "Agents can analyse history and comments once the client connects with you.",
      pattern: "pattern-dots",
    },
  ]),
  closingHeadline: "Assign the video. Review the log.",
  closingSub:
    "Free forever. Clients import YouTube homework as timed workouts, master the session, and leave notes you can actually use.",
  closingCta: "Get started with clients",
  faqs: [
    {
      q: "Can I assign any YouTube workout?",
      a: "Yes. Clients paste the URL you send. Epic Gains turns it into timed exercises they follow and log — your link becomes the session.",
    },
    {
      q: "Is Epic Gains free for coaches and clients?",
      a: "Yes — free forever. No credit card, no trial, no paid tier.",
    },
    {
      q: "How do I see a client’s work?",
      a: "Follows are request-based. Once they accept, you can see their showcase of mastered sessions — not a public leaderboard.",
    },
    {
      q: "What does “mastered” mean?",
      a: "The client imported the video, followed the structured workout, and logged it. That is stronger signal than “I watched it.”",
    },
    {
      q: "What is MCP?",
      a: "With an accepted follow, an agent connected to Epic Gains can analyse that person’s log history and comments for a daily pulse grounded in real sessions.",
    },
  ],
  footerTagline: "Assigned videos. Structured logs.",
  metaTitle: "Epic Gains — Coaches: assign YouTube workouts clients can log",
  metaDescription:
    "Coaches: turn assigned YouTube videos into timed workouts clients follow and master. Request-based follows. Free forever.",
  navLabel: "Coaches",
};

const BY_ID: Record<AudienceId, AudienceCopy> = {
  "home-gym": homeGym,
  rehab,
  "train-like": trainLike,
  creators,
  coaches,
};

export function parseAudience(value: string | undefined | null): AudienceId | null {
  if (!value) return null;
  if ((AUDIENCE_IDS as readonly string[]).includes(value)) {
    return value as AudienceId;
  }
  return null;
}

export function getAudienceCopy(audience: AudienceId | null): AudienceCopy {
  if (!audience) return DEFAULT_AUDIENCE_COPY;
  return BY_ID[audience];
}

export function audienceNavLinks(): Array<{ id: AudienceId; label: string; href: string }> {
  return AUDIENCE_IDS.map((id) => ({
    id,
    label: BY_ID[id].navLabel,
    href: `/?audience=${id}`,
  }));
}
