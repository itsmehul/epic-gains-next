"use client";

import { IconTrophy } from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import {
  ACHIEVEMENT_UNLOCKED_EVENT,
} from "@/features/achievements/hooks";
import type { UnlockedAchievement } from "@/features/achievements/types";

type QueueItem = UnlockedAchievement & { key: string };

export function AchievementUnlockToaster() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const current = queue[0] ?? null;

  useEffect(() => {
    function onUnlock(event: Event) {
      const custom = event as CustomEvent<UnlockedAchievement[]>;
      const items = custom.detail ?? [];
      if (items.length === 0) return;
      setQueue((prev) => [
        ...prev,
        ...items.map((item, index) => ({
          ...item,
          key: `${item.id}-${item.workoutId ?? "g"}-${Date.now()}-${index}`,
        })),
      ]);
    }
    window.addEventListener(ACHIEVEMENT_UNLOCKED_EVENT, onUnlock);
    return () =>
      window.removeEventListener(ACHIEVEMENT_UNLOCKED_EVENT, onUnlock);
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [current]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-4 left-4 z-100 flex w-[min(22rem,calc(100vw-2rem))] flex-col"
    >
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.key}
            animate={{ opacity: 1, x: 0 }}
            className="pointer-events-auto relative isolate overflow-hidden rounded-[28px] bg-primary text-primary-foreground shadow-[0_4px_8px_oklch(0_0_0/0.18),0_1px_3px_oklch(0_0_0/0.12)]"
            exit={{ opacity: 0, x: -24 }}
            initial={{ opacity: 0, x: -48 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div
              aria-hidden
              className="pattern-diagonal pointer-events-none absolute inset-0 opacity-70"
            />
            <div className="relative flex items-center gap-3 px-4 py-3.5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15">
                <IconTrophy className="size-6" stroke={1.6} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium tracking-[0.4px] uppercase opacity-80">
                  Achievement unlocked
                </p>
                <p className="truncate text-base font-medium tracking-[0.15px]">
                  {current.name}
                </p>
                {current.workoutName ? (
                  <p className="truncate text-xs opacity-80">
                    {current.workoutName}
                  </p>
                ) : null}
                <p className="text-sm font-medium opacity-85">
                  {current.gamerscore}G
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
