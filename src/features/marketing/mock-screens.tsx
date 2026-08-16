import {
  IconArrowLeft,
  IconCalendarEvent,
  IconCheck,
  IconChevronRight,
  IconFocus2,
  IconLayoutSidebar,
  IconLock,
  IconNotebook,
  IconPlayerPlay,
  IconTrophy,
} from "@/components/ui/icons";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_CATEGORY_VALUES,
  type AchievementCategory,
} from "@/features/achievements/catalog";
import type { AchievementListItem } from "@/features/achievements/types";
import { defaultAvatarUrl } from "@/shared/avatar";
import { cn } from "@/shared/utils";

const MOCK_PROFILE = {
  name: "Maya Chen",
  username: "maya",
  followersCount: 18,
  followingCount: 7,
};

const MOCK_PROFILE_WORKOUTS = [
  { id: "mobility", name: "Full Body Mobility Flow", role: "OWNER" as const },
  { id: "push", name: "Upper Body Push Strength", role: "OWNER" as const },
  { id: "legs", name: "Quad-Focused Leg Day", role: "MEMBER" as const },
];

const CATEGORY_ICONS: Record<AchievementCategory, typeof IconTrophy> = {
  ink: IconNotebook,
  days: IconCalendarEvent,
  tapes: IconPlayerPlay,
  targets: IconFocus2,
};

const MOCK_ACHIEVEMENTS: AchievementListItem[] = [
  {
    id: "wet_ink",
    name: "Tutorial Complete",
    description: "Log your first set.",
    gamerscore: 5,
    category: "ink",
    target: 1,
    progress: 1,
    unlocked: true,
    unlockedAt: new Date(Date.now() - 12 * 86_400_000),
  },
  {
    id: "margin_notes",
    name: "No Longer a Noob",
    description: "Log 10 sets.",
    gamerscore: 10,
    category: "ink",
    target: 10,
    progress: 10,
    unlocked: true,
    unlockedAt: new Date(Date.now() - 8 * 86_400_000),
  },
  {
    id: "filled_page",
    name: "XP Farm",
    description: "Log 40 sets.",
    gamerscore: 15,
    category: "ink",
    target: 40,
    progress: 28,
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: "back_to_back",
    name: "Daily Login",
    description: "Log a set on 2 consecutive days.",
    gamerscore: 10,
    category: "days",
    target: 2,
    progress: 2,
    unlocked: true,
    unlockedAt: new Date(Date.now() - 5 * 86_400_000),
  },
  {
    id: "overwritten",
    name: "Rampage",
    description: "Log 40 sets in one day.",
    gamerscore: 30,
    category: "ink",
    secret: true,
    target: 40,
    progress: 12,
    unlocked: false,
    unlockedAt: null,
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function MockShellHeader({
  actions,
  showBack,
  title,
}: {
  actions?: ReactNode;
  showBack?: boolean;
  title: string;
}) {
  return (
    <header className="sticky top-0 z-20 w-full shrink-0 bg-content-panel shadow-[0_4px_8px_-4px_oklch(0_0_0/0.1)] dark:shadow-[0_4px_8px_-4px_oklch(0_0_0/0.4)]">
      <div className="flex h-12 items-center gap-2 px-3">
        <span
          aria-hidden
          className="-ml-1 flex size-8 shrink-0 items-center justify-center text-foreground"
        >
          {showBack ? (
            <IconArrowLeft className="size-4" />
          ) : (
            <IconLayoutSidebar className="size-4" stroke={1.75} />
          )}
        </span>
        <h1 className="min-w-0 flex-1 truncate py-0 pr-4 text-base font-semibold tracking-tight">
          {title}
        </h1>
        {actions ? (
          <div className="ml-2 flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

function MockScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-content-panel text-foreground">
      {children}
    </div>
  );
}

export function MockProfileScreen() {
  return (
    <MockScreenShell>
      <MockShellHeader
        actions={
          <span className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium">
            Following
          </span>
        }
        showBack
        title={`@${MOCK_PROFILE.username}`}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-6 px-4 py-4">
          <div className="flex items-start gap-4">
            <Avatar className="size-16" size="lg">
              <AvatarImage
                alt=""
                src={defaultAvatarUrl(MOCK_PROFILE.username)}
              />
              <AvatarFallback>{initials(MOCK_PROFILE.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-lg leading-tight font-semibold">
                {MOCK_PROFILE.name}
              </p>
              <p className="text-muted-foreground text-sm">
                @{MOCK_PROFILE.username}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-muted/50 grid grid-cols-3 overflow-hidden rounded-2xl">
              <div className="px-3 py-2.5">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
                  Sets
                </p>
                <p className="mt-0.5 text-lg font-medium tabular-nums">248</p>
              </div>
              <div className="border-border/70 border-l px-3 py-2.5">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
                  Days
                </p>
                <p className="mt-0.5 text-lg font-medium tabular-nums">32</p>
              </div>
              <div className="border-border/70 border-l px-3 py-2.5">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
                  Streak
                </p>
                <p className="mt-0.5 text-lg font-medium tabular-nums">4d</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/60 relative isolate overflow-hidden rounded-2xl px-3.5 py-3">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
                  Favourite workout
                </p>
                <p className="mt-3 text-[15px] leading-5 font-medium">
                  {MOCK_PROFILE_WORKOUTS[1]?.name}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">86 sets</p>
              </div>
              <div className="bg-muted/60 relative isolate overflow-hidden rounded-2xl px-3.5 py-3">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
                  Favourite exercise
                </p>
                <p className="mt-3 text-[15px] leading-5 font-medium">
                  Incline Dumbbell Press
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">41 sets</p>
              </div>
              <div className="bg-muted/60 relative isolate overflow-hidden rounded-2xl px-3.5 py-3">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
                  Most trained
                </p>
                <p className="mt-3 text-[15px] leading-5 font-medium">Chest</p>
                <p className="text-muted-foreground mt-0.5 text-xs">72 sets</p>
              </div>
              <div className="bg-primary text-primary-foreground relative isolate overflow-hidden rounded-2xl px-3.5 py-3">
                <p className="text-[11px] font-medium tracking-[0.32px] uppercase opacity-80">
                  Latest unlock
                </p>
                <p className="mt-3 text-[15px] leading-5 font-medium">
                  {MOCK_ACHIEVEMENTS[1]?.name}
                </p>
                <p className="mt-0.5 text-xs opacity-80">
                  {MOCK_ACHIEVEMENTS[1]?.gamerscore}G
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="workouts">
            <TabsList className="w-full" variant="line">
              <TabsTrigger value="workouts">Workouts</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="followers">Followers</TabsTrigger>
              <TabsTrigger value="following">Following</TabsTrigger>
            </TabsList>
            <TabsContent className="mt-4" value="workouts">
              <ul className="flex flex-col">
                {MOCK_PROFILE_WORKOUTS.map((workout) => (
                  <li key={workout.id}>
                    <div className="flex items-center gap-3 px-1 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="leading-snug font-medium">{workout.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {workout.role === "OWNER" ? "Owner" : "Member"}
                        </p>
                      </div>
                      <IconChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MockScreenShell>
  );
}

function formatUnlockedAt(value: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MockFilterChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-medium tracking-[0.1px]",
        active
          ? "bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--secondary-foreground)_12%,transparent)]"
          : "text-foreground bg-transparent shadow-[inset_0_0_0_1px_var(--border)]",
      )}
    >
      {active ? <IconCheck className="size-3.5" stroke={2.2} /> : null}
      {label}
    </span>
  );
}

function MockAchievementTile({ item }: { item: AchievementListItem }) {
  const hidden = item.secret && !item.unlocked;
  const Icon = CATEGORY_ICONS[item.category];
  const pct = item.target > 0 ? Math.round((item.progress / item.target) * 100) : 0;

  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-xl px-4 py-3.5",
        item.unlocked ? "bg-primary/10" : "bg-muted/55",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-80",
          item.unlocked ? "pattern-dots" : "pattern-graph",
        )}
      />
      <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-full",
            item.unlocked
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {hidden ? (
            <IconLock className="size-5" stroke={1.7} />
          ) : item.unlocked ? (
            <IconCheck className="size-5" stroke={2} />
          ) : (
            <Icon className="size-5" stroke={1.7} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[16px] leading-6 font-medium tracking-[0.15px]">
              {hidden ? "Secret" : item.name}
            </p>
            {item.unlocked ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {ACHIEVEMENT_CATEGORY_LABELS[item.category]}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm leading-5 tracking-[0.25px]">
            {hidden ? "Keep logging sets to reveal this one." : item.description}
          </p>
          {!item.unlocked ? (
            <div className="mt-2.5 flex items-center gap-3">
              <Progress className="min-w-0 flex-1 gap-0" value={pct}>
                <ProgressTrack className="h-1.5">
                  <ProgressIndicator />
                </ProgressTrack>
              </Progress>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {item.progress}/{item.target}
              </span>
            </div>
          ) : (
            <p className="text-primary mt-1 text-xs font-medium tracking-[0.4px]">
              Unlocked {formatUnlockedAt(item.unlockedAt) ?? ""}
            </p>
          )}
        </div>
        <p
          className={cn(
            "shrink-0 text-sm font-medium tracking-[0.1px] tabular-nums",
            item.unlocked ? "text-primary" : "text-muted-foreground",
          )}
        >
          {item.gamerscore}G
        </p>
      </div>
    </article>
  );
}

export function MockAchievementsScreen() {
  const unlockedCount = MOCK_ACHIEVEMENTS.filter((item) => item.unlocked).length;
  const gamerscore = MOCK_ACHIEVEMENTS.filter((item) => item.unlocked).reduce(
    (sum, item) => sum + item.gamerscore,
    0,
  );
  const unlockPct = Math.round((unlockedCount / MOCK_ACHIEVEMENTS.length) * 100);

  return (
    <MockScreenShell>
      <MockShellHeader title="Achievements" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-6 px-4 py-4">
          <section className="relative isolate overflow-hidden rounded-[28px] bg-primary px-6 py-6 text-primary-foreground">
            <div
              aria-hidden
              className="pattern-diagonal pointer-events-none absolute inset-0 opacity-70"
            />
            <div
              aria-hidden
              className="pattern-plus pointer-events-none absolute inset-0"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.4px] uppercase opacity-80">
                  Gamerscore
                </p>
                <p className="mt-1 text-[40px] leading-12 font-normal tracking-tight">
                  {gamerscore}
                  <span className="ml-1 text-xl opacity-70">/860</span>
                </p>
                <p className="mt-1 text-sm leading-5 opacity-85">
                  {unlockedCount} of {MOCK_ACHIEVEMENTS.length} unlocked
                </p>
              </div>
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
                <IconTrophy className="size-7" stroke={1.6} />
              </div>
            </div>
            <Progress className="relative mt-5 w-full gap-0" value={unlockPct}>
              <ProgressTrack className="h-1.5 bg-primary-foreground/20">
                <ProgressIndicator className="bg-primary-foreground" />
              </ProgressTrack>
            </Progress>
          </section>

          <div className="-mx-1 flex gap-2 overflow-hidden px-1 pb-1">
            <MockFilterChip active label="All" />
            {ACHIEVEMENT_CATEGORY_VALUES.map((category) => (
              <MockFilterChip
                key={category}
                active={false}
                label={ACHIEVEMENT_CATEGORY_LABELS[category]}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {MOCK_ACHIEVEMENTS.map((item) => (
              <MockAchievementTile item={item} key={item.id} />
            ))}
          </div>
        </div>
      </div>
    </MockScreenShell>
  );
}
