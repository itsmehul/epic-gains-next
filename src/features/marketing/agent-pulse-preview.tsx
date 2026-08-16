import { IconBrandYoutubeFilled } from "@tabler/icons-react";
import Image from "next/image";
import type { ReactNode } from "react";

const MOBILITY_VIDEO = {
  url: "https://www.youtube.com/watch?v=WUKHM6-ekJM",
  title: "8-Minute Hip Mobility Routine | Loosen Tight Hips (No Equipment)",
  channel: "nourishmovelove",
  thumbnail: "https://i.ytimg.com/vi/WUKHM6-ekJM/hqdefault.jpg",
};

const RDL_VIDEO = {
  url: "https://www.youtube.com/watch?v=hu3jRvTc_po",
  title: "The PERFECT Dumbbell Romanian Deadlift",
  channel: "deltabolic",
  thumbnail: "https://i.ytimg.com/vi/hu3jRvTc_po/hqdefault.jpg",
};

function PulseCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full max-w-85 shrink-0">
      <div className="relative isolate overflow-hidden rounded-lg bg-surface-container-low text-card-foreground">
        {children}
      </div>
    </div>
  );
}

function PulseHeader({ kicker, agent }: { kicker: string; agent: string }) {
  return (
    <div className="relative flex items-center justify-between px-5 pt-5 pb-3">
      <p className="text-[0.7rem] font-medium tracking-[0.4px] text-muted-foreground uppercase">
        {kicker}
      </p>
      <p className="text-[0.7rem] font-medium text-primary">{agent}</p>
    </div>
  );
}

function PulseBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md bg-surface-container-highest px-3.5 py-3">
      <p className="text-[0.65rem] font-medium tracking-[0.35px] text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

function WatchNext({
  url,
  title,
  channel,
  thumbnail,
}: {
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex overflow-hidden rounded-md bg-on-primary-container/8 ring-1 ring-on-primary-container/12 transition-colors hover:bg-on-primary-container/12"
    >
      <Image
        src={thumbnail}
        alt=""
        width={160}
        height={90}
        className="h-[4.5rem] w-20 shrink-0 object-cover"
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2">
        <span className="flex items-center gap-1 text-[0.65rem] font-medium tracking-[0.2px] uppercase opacity-75">
          <IconBrandYoutubeFilled className="size-3.5" aria-hidden />
          Watch next
        </span>
        <span className="line-clamp-2 text-sm leading-snug font-medium">
          {title}
        </span>
        <span className="truncate text-[0.7rem] opacity-70">{channel}</span>
      </span>
    </a>
  );
}

function OwnLogPulse() {
  return (
    <PulseCard>
      <PulseHeader kicker="Daily pulse · MCP" agent="Your agent" />
      <div className="relative space-y-3 px-4 pb-5">
        <PulseBlock label="Log · Romanian deadlift">
          <p className="mt-1.5 text-sm leading-relaxed">
            3 × 8 @ 22.5 kg · same load as last week, last set cut at 6
          </p>
          <p className="text-muted-foreground mt-2 text-[0.7rem]">
            Full body dumbbell burn · yesterday
          </p>
        </PulseBlock>
        <PulseBlock label="Comment">
          <p className="mt-1.5 text-sm leading-relaxed">
            I had a hard time with this range of motion.
          </p>
        </PulseBlock>
        <div className="rounded-md bg-primary-container px-3.5 py-3 text-on-primary-container">
          <p className="text-[0.65rem] font-medium tracking-[0.35px] uppercase opacity-80">
            Next steps
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            Load held, reps dropped, and your note called ROM. Mobility first,
            then RDLs from blocks so the range you own stays honest.
          </p>
          <WatchNext {...MOBILITY_VIDEO} />
        </div>
      </div>
    </PulseCard>
  );
}

function FollowingPulse() {
  return (
    <PulseCard>
      <PulseHeader kicker="Ask about · following" agent="Your agent" />
      <div className="relative space-y-3 px-4 pb-5">
        <PulseBlock label="You asked">
          <p className="mt-1.5 text-sm leading-relaxed">
            What did @jordan lift this week, and should I copy any of it?
          </p>
        </PulseBlock>
        <PulseBlock label="Following · @jordan">
          <p className="mt-1.5 text-sm leading-relaxed">
            Pull day · Tuesday · 4 × 8 seated row @ 32.5 kg, then 3 × 10 RDLs
            at 30 kg
          </p>
          <p className="text-muted-foreground mt-2 text-[0.7rem]">
            Comment: “Rows felt easy. RDLs still sticky below the knee.”
          </p>
        </PulseBlock>
        <div className="rounded-md bg-primary-container px-3.5 py-3 text-on-primary-container">
          <p className="text-[0.65rem] font-medium tracking-[0.35px] uppercase opacity-80">
            Read from their log
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            Jordan is 7.5 kg ahead on RDLs, but the same ROM note as yours.
            Match the row volume this week — keep your RDL load and steal their
            hip-opener instead of chasing the extra plates.
          </p>
          <WatchNext {...RDL_VIDEO} />
        </div>
      </div>
    </PulseCard>
  );
}

export function AgentPulsePreview() {
  return (
    <div className="flex snap-x snap-mandatory justify-start gap-4 overflow-x-auto pt-2 pb-2 scrollbar-none md:justify-center md:gap-8 md:overflow-visible">
      <div className="snap-start">
        <OwnLogPulse />
      </div>
      <div className="snap-start">
        <FollowingPulse />
      </div>
    </div>
  );
}
