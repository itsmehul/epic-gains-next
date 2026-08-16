"use client";

import { IconCheck, IconTrophy } from "@/components/ui/icons";
import { useMemo, useState } from "react";

import { AchievementTile } from "@/components/achievements/achievement-tile";
import {
  AppShellBody,
  AppShellHeader,
  AppShellLoading,
  AppShellScroll,
} from "@/components/layout/app-shell";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_CATEGORY_VALUES,
} from "@/features/achievements/catalog";
import { useAchievements } from "@/features/achievements/hooks";
import { cn } from "@/shared/utils";

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
