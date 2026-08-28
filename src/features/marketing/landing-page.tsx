import {
  IconArrowRight,
  IconBrandYoutubeFilled,
} from "@/components/ui/icons";
import Image from "next/image";
import Link from "next/link";

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

import { AgentPulsePreview } from "./agent-pulse-preview";
import {
  audienceNavLinks,
  getAudienceCopy,
  type AudienceId,
} from "./audiences";
import { ExampleVideoShowcase } from "./example-videos";
import { MarketingPhoneFrame } from "./marketing-phone-frame";
import { MockAchievementsScreen, MockProfileScreen } from "./mock-screens";

function ChapterLabel({ children }: { children: string }) {
  return (
    <p className="text-primary text-sm font-medium tracking-[0.1px]">
      {children}
    </p>
  );
}

function AudienceHeroNav({
  audience,
  links,
}: {
  audience: AudienceId | null;
  links: ReturnType<typeof audienceNavLinks>;
}) {
  const items = [
    { id: null as AudienceId | null, label: "Everyone", href: "/" },
    ...links.map((link) => ({
      id: link.id as AudienceId | null,
      label: link.label,
      href: link.href,
    })),
  ];

  return (
    <nav
      aria-label="Who this is for"
      className="mb-6 flex flex-wrap items-center justify-center gap-2"
    >
      {items.map((item) => {
        const selected = audience === item.id;
        return (
          <Badge
            key={item.href}
            variant={selected ? "default" : "outline"}
            render={
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
              />
            }
            className="h-9 px-3.5 text-[0.8125rem]"
          >
            {item.label}
          </Badge>
        );
      })}
    </nav>
  );
}

export function LandingPage({
  authenticated,
  audience = null,
}: {
  authenticated: boolean;
  audience?: AudienceId | null;
}) {
  const copy = getAudienceCopy(audience);
  const navLinks = audienceNavLinks();

  return (
    <div className="fit-landing dark bg-background text-foreground min-h-full antialiased">
      <header className="bg-background sticky top-0 z-50 h-16 border-b border-border/70">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src={BRAND_ICON}
              alt=""
              width={36}
              height={36}
              unoptimized
              className="size-9"
              aria-hidden
            />
            <span className="font-brand text-[1.05rem] font-semibold tracking-tight">
              {APP_NAME}
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {authenticated ? (
              <Link
                href="/workouts"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Enter App
                <IconArrowRight data-icon="inline-end" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "hidden sm:inline-flex",
                  )}
                >
                  Sign in
                </Link>
                <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden px-5 pt-10 pb-8 sm:px-8 sm:pt-16 sm:pb-10">
        <div
          aria-hidden
          className="pattern-hero-dots pointer-events-none absolute inset-0"
        />
        <div className="relative mx-auto w-full max-w-3xl text-center">
          <AudienceHeroNav audience={audience} links={navLinks} />
          <h1 className="text-[2.15rem] leading-[1.12] font-normal tracking-tight text-balance sm:text-5xl sm:leading-[1.08] lg:text-[3.35rem]">
            {copy.heroShowsYoutubeIcon ? (
              <>
                Master{" "}
                <IconBrandYoutubeFilled
                  aria-hidden
                  className="icon-2-5d size-[0.85em] align-middle text-primary"
                />{" "}
                workouts and build an epic collection
              </>
            ) : (
              copy.heroHeadline
            )}
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty">
            {copy.heroSub}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-7")}
            >
              {copy.heroCta}
            </Link>
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 px-7",
              )}
            >
              {copy.heroSecondaryCta}
            </Link>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">{copy.freeNote}</p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <div className="mx-auto w-full max-w-6xl">
          <ExampleVideoShowcase />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <ChapterLabel>{copy.showcaseChapter}</ChapterLabel>
          <h2 className="headline-large mt-3 tracking-tight text-balance sm:text-4xl sm:leading-[1.15]">
            {copy.showcaseHeadline}
          </h2>
        </div>
        <div className="mt-10 flex snap-x snap-mandatory justify-start gap-4 overflow-x-auto pt-2 pb-2 scrollbar-none md:justify-center md:gap-8 md:overflow-visible">
          <MarketingPhoneFrame className="pointer-events-none snap-start">
            <MockProfileScreen />
          </MarketingPhoneFrame>
          <MarketingPhoneFrame className="pointer-events-none snap-start">
            <MockAchievementsScreen />
          </MarketingPhoneFrame>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <ChapterLabel>{copy.pulseChapter}</ChapterLabel>
          <h2 className="headline-large mt-3 tracking-tight text-balance sm:text-4xl sm:leading-[1.15]">
            {copy.pulseHeadline}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            {copy.pulseSub}
          </p>
        </div>
        <div className="mt-10">
          <AgentPulsePreview />
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <ChapterLabel>{copy.pathChapter}</ChapterLabel>
          <h2 className="headline-large mt-3 tracking-tight text-balance sm:text-4xl sm:leading-[1.15]">
            {copy.pathHeadline}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            {copy.pathSub}
          </p>
        </div>
        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {copy.beats.map((item) => (
            <li
              key={item.title}
              className="relative isolate overflow-hidden rounded-lg bg-surface-container-low p-6"
            >
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-80",
                  item.pattern,
                )}
              />
              <div className="relative">
                <div className="grid size-12 place-items-center rounded-lg bg-primary-container text-on-primary-container">
                  <item.icon className="size-5" stroke={1.6} />
                </div>
                <p className="text-muted-foreground mt-4 text-xs font-medium tracking-[0.4px] uppercase">
                  {item.kicker}
                </p>
                <h3 className="mt-1.5 text-base font-medium tracking-[0.15px] text-pretty">
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
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pattern-diagonal pointer-events-none absolute inset-0 opacity-70"
          />
          <div
            aria-hidden
            className="pattern-plus pointer-events-none absolute inset-0"
          />
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="headline-large tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
              {copy.closingHeadline}
            </h2>
            <p className="mt-5 text-base leading-relaxed opacity-85">
              {copy.closingSub}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "h-12 px-7",
                )}
              >
                {copy.closingCta}
              </Link>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 border-primary-foreground/30 bg-transparent px-7 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
              >
                {copy.heroSecondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-24"
      >
        <h2 className="headline-large text-center tracking-tight">Questions</h2>
        <Accordion className="mt-10">
          {copy.faqs.map((item, index) => (
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
              unoptimized
              className="size-8"
              aria-hidden
            />
            <span className="font-brand text-sm font-medium">{APP_NAME}</span>
          </div>
          <p className="text-muted-foreground text-sm">{copy.footerTagline}</p>
        </div>
        <nav
          aria-label="Audience pages"
          className="text-muted-foreground mx-auto mt-6 flex w-full max-w-6xl flex-wrap gap-x-4 gap-y-2 text-sm"
        >
          <Link href="/" className="hover:text-foreground transition-colors">
            Everyone
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className={cn(
                "hover:text-foreground transition-colors",
                audience === link.id && "text-foreground font-medium",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
