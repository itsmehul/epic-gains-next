"use client";

import Link from "next/link";

import type { AchievementListItem } from "@/features/achievements/types";
import { cn } from "@/shared/utils";

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
      <Link
        href="/achievements"
        className="text-muted-foreground hover:text-foreground shrink-0 text-xs tabular-nums transition-colors"
        aria-label={`${unlocked.length} of ${total} overall achievements unlocked`}
      >
        {unlocked.length}/{total}
      </Link>
      {unlocked.length > 0 ? (
        <div className="-mx-0.5 min-w-0 flex-1 overflow-x-auto overscroll-x-contain px-0.5 scrollbar-none">
          <ul className="text-muted-foreground flex w-max items-center gap-2 text-xs">
            {unlocked.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2">
                {index > 0 ? (
                  <span className="text-muted-foreground/40" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href="/achievements"
                  className="hover:text-foreground inline-flex max-w-40 truncate transition-colors"
                  title={item.description}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
