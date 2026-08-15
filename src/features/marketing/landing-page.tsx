import Image from "next/image";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME, BRAND_ICON } from "@/shared/pwa/constants";
import { cn } from "@/shared/utils";

import { FitBlobCluster, FitBlobField } from "./fit-blobs";
import { WorkoutPreview } from "./workout-preview";

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

const features = [
  {
    icon: IconBarbell,
    title: "Every set",
    body: "Weight, reps, and notes without a cluttered spreadsheet.",
    pattern: "pattern-dots",
  },
  {
    icon: IconActivity,
    title: "Clear trends",
    body: "See whether a lift is moving before you guess next week.",
    pattern: "pattern-graph",
  },
  {
    icon: IconUsers,
    title: "Private friends",
    body: "Share a feed with people you actually train with.",
    pattern: "pattern-dots",
  },
  {
    icon: IconBrain,
    title: "Agent-ready",
    body: "MCP access so recaps come from your log, not a chat guess.",
    pattern: "pattern-graph",
  },
];

export function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-full antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <header className="bg-background/80 sticky top-0 z-20 border-b border-border/60 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
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
          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={buttonVariants({ size: "sm" })}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pt-10 pb-20 sm:px-8 sm:pt-16 sm:pb-28">
        <FitBlobField className="pointer-events-none absolute inset-x-0 top-[-8%] h-[120%] w-full opacity-80 sm:top-[-14%]" />
        <div
          aria-hidden
          className="pattern-plus-ink pointer-events-none absolute inset-0"
        />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="text-center lg:text-left">
            <Badge
              variant="secondary"
              className="h-7 px-3 text-[11px] tracking-[0.2px]"
            >
              Strength journal
            </Badge>
            <h1 className="mt-5 text-[2.35rem] leading-[1.12] font-medium tracking-tight text-balance sm:text-6xl sm:leading-[1.08]">
              Coaching you to stronger, more consistent training
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty lg:mx-0">
              Scattered notes become a living journal. Log every set, see the
              trend, and keep showing up.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ size: "lg" }), "h-12 px-7")}
              >
                Create your journal
              </Link>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 px-7",
                )}
              >
                Sign in
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
            <WorkoutPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className="order-2 flex justify-center lg:order-1">
          <div className="relative">
            <FitBlobCluster palette="ember" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative isolate grid size-28 place-items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground">
                <div
                  aria-hidden
                  className="pattern-diagonal pointer-events-none absolute inset-0 opacity-50"
                />
                <IconHeart className="relative size-12" stroke={1.5} />
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-primary text-sm font-medium tracking-[0.4px] uppercase">
            Strength goals
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Goals that actually change how you train
          </h2>
          <p className="text-muted-foreground mt-5 max-w-lg text-base leading-relaxed">
            Being consistent matters more than a perfect program. Epic Gains
            treats each logged set as a vote for the athlete you are becoming —
            not a score you have to chase on a leaderboard.
          </p>
          <p className="text-muted-foreground mt-4 max-w-lg text-base leading-relaxed">
            It takes a handful of honest sessions each week. Track load, reps,
            and how the work felt, then let the history coach the next session.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div>
          <p className="text-primary text-sm font-medium tracking-[0.4px] uppercase">
            Coaching that fits you
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Tips from your own history — not a generic plan
          </h2>
          <p className="text-muted-foreground mt-5 max-w-lg text-base leading-relaxed">
            Progress lives in the details you already logged. Review last week,
            spot stalled lifts, and ask an agent to recap yesterday from the
            same data you trust.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="relative">
            <FitBlobCluster palette="amber" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative isolate w-56 overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-foreground/8 dark:ring-foreground/12">
                <div
                  aria-hidden
                  className="pattern-dots pointer-events-none absolute inset-0 opacity-70"
                />
                <p className="relative text-xs font-medium tracking-[0.4px] text-muted-foreground uppercase">
                  This week
                </p>
                <p className="relative mt-1 text-2xl font-medium tracking-tight">
                  18,400 kg
                </p>
                <p className="relative mt-1 text-sm font-medium text-primary">
                  Volume up 8%
                </p>
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
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            From a quiet garage session to a crowded commercial gym, every set
            you finish is worth keeping. Epic Gains is the notebook that stays
            with you — and plays nicely with friends and tools you already use.
          </p>
        </div>
        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item) => (
            <li
              key={item.title}
              className="relative isolate overflow-hidden rounded-xl bg-muted/55 p-6"
            >
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-80",
                  item.pattern,
                )}
              />
              <div className="relative">
                <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                  <item.icon className="size-5" stroke={1.6} />
                </div>
                <h3 className="mt-4 text-base font-medium tracking-[0.15px]">
                  {item.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 py-10 sm:px-8 sm:py-16">
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pattern-diagonal pointer-events-none absolute inset-0 opacity-70"
          />
          <div
            aria-hidden
            className="pattern-plus pointer-events-none absolute inset-0"
          />
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-medium tracking-tight text-balance sm:text-5xl">
              Start logging on the web
            </h2>
            <p className="mt-5 text-base leading-relaxed opacity-85">
              Works as a PWA on your phone. Your journal is ready the next time
              you walk into the gym.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "h-12 px-7",
                )}
              >
                Create account
              </Link>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 border-primary-foreground/30 bg-transparent px-7 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="text-center text-3xl font-medium tracking-tight">
          Questions
        </h2>
        <Accordion className="bg-card mt-10">
          {faqs.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t px-5 py-10 sm:px-8">
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
          <p className="text-muted-foreground text-sm">
            A focused journal for every rep.
          </p>
        </div>
      </footer>
    </div>
  );
}
