"use client";

import {
  IconCalendarEvent,
  IconFocus2,
  IconGamepad,
  IconNotebook,
  IconPlayerPlay,
  IconTrophy,
} from "@/components/ui/icons";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { AchievementCategory } from "@/features/achievements/catalog";
import type { AchievementListItem } from "@/features/achievements/types";
import { cn } from "@/shared/utils";

const CATEGORY_ICONS: Record<AchievementCategory, typeof IconTrophy> = {
  ink: IconNotebook,
  days: IconCalendarEvent,
  tapes: IconPlayerPlay,
  targets: IconFocus2,
  hud: IconGamepad,
};

export function GlobalAchievementHeader({
  items,
  className,
}: {
  items: AchievementListItem[];
  className?: string;
}) {
  const globals = items.filter((item) => item.scope === "global");
  const unlocked = globals.filter((item) => item.unlocked);
  const total = globals.length;

  if (total === 0) return null;

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", className)}>
      <Badge
        render={<Link href="/achievements" />}
        variant="secondary"
        className="h-5 px-1.5 text-[11px] tabular-nums"
        aria-label={`${unlocked.length} of ${total} overall achievements unlocked`}
      >
        {unlocked.length}/{total}
      </Badge>
      {unlocked.length > 0 ? (
        <div className="-mx-0.5 min-w-0 flex-1 overflow-x-auto overscroll-x-contain px-0.5 scrollbar-none">
          <ul className="flex w-max items-center gap-1.5">
            {unlocked.map((item) => {
              const Icon = CATEGORY_ICONS[item.category];
              return (
                <li key={item.id}>
                  <Link
                    href="/achievements"
                    className="bg-muted text-foreground hover:bg-muted/80 inline-flex h-6 max-w-40 items-center gap-1 rounded-full px-2 text-xs font-medium tracking-[0.1px]"
                    title={item.description}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
