"use client";

import {
  IconCalendarEvent,
  IconCheck,
  IconFocus2,
  IconLock,
  IconNotebook,
  IconPlayerPlay,
  IconTrophy,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellLoading,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_CATEGORY_VALUES,
  type AchievementCategory,
} from "@/features/achievements/catalog";
import { useAchievements } from "@/features/achievements/hooks";
import type { AchievementListItem } from "@/features/achievements/types";
import { cn } from "@/shared/utils";

const CATEGORY_ICONS: Record<AchievementCategory, typeof IconTrophy> = {
  ink: IconNotebook,
  days: IconCalendarEvent,
  tapes: IconPlayerPlay,
  targets: IconFocus2,
};

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

function FilterChip({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-medium tracking-[0.1px] transition-[background-color,box-shadow,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        active
          ? "bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--secondary-foreground)_12%,transparent)]"
          : "text-foreground bg-transparent shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted/70",
      )}
    >
      {active ? <IconCheck className="size-3.5" stroke={2.2} /> : null}
      {label}
    </button>
  );
}

function AchievementTile({ item }: { item: AchievementListItem }) {
  const hidden = item.secret && !item.unlocked;
  const Icon = CATEGORY_ICONS[item.category];
  const pct = item.target > 0 ? Math.round((item.progress / item.target) * 100) : 0;

  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-xl px-4 py-3.5 transition-colors duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
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
          "shrink-0 text-sm font-medium tabular-nums tracking-[0.1px]",
          item.unlocked ? "text-primary" : "text-muted-foreground",
        )}
      >
        {item.gamerscore}G
      </p>
      </div>
    </article>
  );
}

export function AchievementsPageClient() {
  const query = useAchievements();
  const [tab, setTab] = useState("all");
  const data = query.data;

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tab === "all") return data.items;
    return data.items.filter((item) => item.category === tab);
  }, [data, tab]);

  const unlockPct =
    !data || data.items.length === 0
      ? 0
      : Math.round((data.unlockedCount / data.items.length) * 100);

  return (
    <AppShellScroll>
      <AppShellHeader title="Achievements" />
      <AppShellBody>
        <div className="flex flex-col gap-6 px-4 py-4 md:p-6">
          {query.isLoading ? (
            <AppShellLoading />
          ) : query.isError || !data ? (
            <p className="text-muted-foreground text-sm">
              Couldn’t load achievements.
            </p>
          ) : (
            <>
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
                      {data.gamerscore}
                      <span className="ml-1 text-xl opacity-70">
                        /{data.totalGamerscore}
                      </span>
                    </p>
                    <p className="mt-1 text-sm leading-5 opacity-85">
                      {data.unlockedCount} of {data.items.length} unlocked
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

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
                <FilterChip
                  active={tab === "all"}
                  label="All"
                  onSelect={() => setTab("all")}
                />
                {ACHIEVEMENT_CATEGORY_VALUES.map((category) => (
                  <FilterChip
                    key={category}
                    active={tab === category}
                    label={ACHIEVEMENT_CATEGORY_LABELS[category]}
                    onSelect={() => setTab(category)}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {filtered.map((item) => (
                  <AchievementTile item={item} key={item.id} />
                ))}
              </div>
            </>
          )}
        </div>
      </AppShellBody>
    </AppShellScroll>
  );
}
