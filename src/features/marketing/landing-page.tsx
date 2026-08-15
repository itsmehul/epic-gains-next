import Image from "next/image";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  IconActivity,
  IconBarbell,
  IconBrain,
  IconHeart,
  IconUsers,
} from "@tabler/icons-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { APP_NAME, BRAND_ICON } from "@/shared/pwa/constants";
import { cn } from "@/shared/utils";

import { FitBlobCluster, FitBlobField } from "./fit-blobs";
import { WorkoutPreview } from "./workout-preview";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const faqs = [
  {
    q: "Is Epic Gains free?",
    a: "Yes. Create an account and start logging sets. No credit card, no trial clock.",
  },
  {
    q: "Do I need a wearable?",
    a: "No. Epic Gains is a strength journal — you log what you lifted. Wearables are optional; your notebook is the source of truth.",
  },
  {
    q: "Can friends see my workouts?",
    a: "Only if you connect. Follows are request-based, like a private feed — not a public leaderboard.",
  },
  {
    q: "What about AI and Cursor?",
    a: "You can connect Epic Gains as an MCP server so agents recap sessions from your own logs, without copying spreadsheets.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

function PillLink({
  href,
  children,
  dark = true,
}: {
  href: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-full px-7 text-[0.9375rem] font-medium transition-colors",
        dark
          ? "bg-[#202124] text-white hover:bg-[#3c4043]"
          : "bg-white text-[#202124] ring-1 ring-[#dadce0] hover:bg-[#f8f9fa]",
      )}
    >
      {children}
    </Link>
  );
}

export function LandingPage() {
  return (
    <div
      className={cn(
        jakarta.className,
        "fit-landing min-h-full bg-white text-[#202124] antialiased",
      )}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src={BRAND_ICON}
            alt=""
            width={36}
            height={36}
            className="size-9"
            aria-hidden
          />
          <span className="text-[1.05rem] font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/sign-in"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-[#3c4043] hover:bg-[#f1f3f4] sm:inline-flex"
          >
            Sign in
          </Link>
          <PillLink href="/sign-up">Get started</PillLink>
        </nav>
      </header>

      <section className="relative overflow-hidden px-5 pb-20 pt-8 sm:px-8 sm:pb-28 sm:pt-16">
        <FitBlobField className="pointer-events-none absolute inset-x-0 top-[-8%] h-[120%] w-full opacity-90 blur-[2px] sm:top-[-18%]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="text-[2.35rem] leading-[1.12] font-medium tracking-tight text-balance sm:text-6xl sm:leading-[1.08]">
            Coaching you to stronger, more consistent training
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#3c4043] text-pretty">
            Scattered notes become a living journal. Log every set, see the
            trend, and keep showing up.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PillLink href="/sign-up">Create your journal</PillLink>
            <PillLink href="/sign-in" dark={false}>
              Sign in
            </PillLink>
          </div>
        </div>
        <div className="relative z-10 mx-auto mt-16 max-w-sm sm:mt-20">
          <WorkoutPreview />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className="order-2 flex justify-center lg:order-1">
          <div className="relative">
            <FitBlobCluster palette="coral" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-28 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm">
                <IconHeart className="size-12 text-[#e8713a]" stroke={1.5} />
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-sm font-semibold tracking-wide text-[#137333]">
            Strength goals
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Goals that actually change how you train
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#3c4043]">
            Being consistent matters more than a perfect program. Epic Gains
            treats each logged set as a vote for the athlete you are becoming —
            not a score you have to chase on a leaderboard.
          </p>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[#3c4043]">
            It takes a handful of honest sessions each week. Track load, reps,
            and how the work felt, then let the history coach the next session.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#137333]">
            Coaching that fits you
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Tips from your own history — not a generic plan
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#3c4043]">
            Progress lives in the details you already logged. Review last week,
            spot stalled lifts, and ask an agent to recap yesterday from the
            same data you trust.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="relative">
            <FitBlobCluster palette="teal" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-55 rounded-3xl bg-white/90 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-medium text-[#5f6368]">This week</p>
                <p className="mt-1 text-2xl font-medium tracking-tight">
                  18,400 kg
                </p>
                <p className="mt-1 text-sm text-[#137333]">Volume up 8%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            However you train, make it count
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#3c4043]">
            From a quiet garage session to a crowded commercial gym, every set
            you finish is worth keeping. Epic Gains is the notebook that stays
            with you — and plays nicely with friends and tools you already use.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: IconBarbell,
              title: "Every set",
              body: "Weight, reps, and notes without a cluttered spreadsheet.",
            },
            {
              icon: IconActivity,
              title: "Clear trends",
              body: "See whether a lift is moving before you guess next week.",
            },
            {
              icon: IconUsers,
              title: "Private friends",
              body: "Share a feed with people you actually train with.",
            },
            {
              icon: IconBrain,
              title: "Agent-ready",
              body: "MCP access so recaps come from your log, not a chat guess.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="rounded-[1.75rem] bg-[#f8f9fa] p-6"
            >
              <item.icon className="size-7 text-[#e8713a]" stroke={1.5} />
              <h3 className="mt-4 text-lg font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5f6368]">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-32">
        <FitBlobField className="pointer-events-none absolute inset-0 h-full w-full scale-110 opacity-70 blur-[1px]" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-medium tracking-tight text-balance sm:text-5xl">
            Start logging on the web
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#3c4043]">
            Works as a PWA on your phone. Your journal is ready the next time
            you walk into the gym.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PillLink href="/sign-up">Create account</PillLink>
            <PillLink href="/sign-in" dark={false}>
              Sign in
            </PillLink>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="text-center text-3xl font-medium tracking-tight">
          Questions
        </h2>
        <Accordion className="mt-10 border-[#e8eaed] bg-white">
          {faqs.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger className="text-[#202124]">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[#5f6368]">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t border-[#e8eaed] px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src={BRAND_ICON}
              alt=""
              width={32}
              height={32}
              className="size-8"
              aria-hidden
            />
            <span className="text-sm font-medium">{APP_NAME}</span>
          </div>
          <p className="text-sm text-[#5f6368]">
            A focused journal for every rep.
          </p>
        </div>
      </footer>
    </div>
  );
}
