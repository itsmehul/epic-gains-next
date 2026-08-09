"use client";

import { IconChevronRight, IconLoader2 } from "@tabler/icons-react";
import Link from "next/link";

import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { useWorkouts } from "@/features/workouts/hooks";
import { cn } from "@/shared/utils";

export function WorkoutsPageClient() {
  const workoutsQuery = useWorkouts();
  const items = workoutsQuery.data?.items ?? [];

  const showList =
    !workoutsQuery.isLoading && !workoutsQuery.isError && items.length > 0;

  return (
    <AppShellScroll>
      <AppShellHeader title="Workouts" />
      <AppShellBody>
        <div className="flex flex-col gap-3 md:gap-6 md:p-6">
          {showList ? (
            <ul className="flex flex-col">
              {items.map((workout) => (
                <li key={workout.id}>
                  <Link
                    className={cn(
                      "hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors md:rounded-xl md:px-3",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-content-panel focus-visible:outline-none",
                    )}
                    href={`/workouts/${workout.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{workout.name}</p>
                    </div>
                    <IconChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {(workoutsQuery.isLoading ||
            workoutsQuery.isError ||
            (!showList && !workoutsQuery.isLoading)) && (
            <div className="flex flex-col gap-6 px-4 py-4 md:px-0 md:py-0">
              {workoutsQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <IconLoader2 className="size-4 animate-spin" />
                  Loading workouts…
                </div>
              ) : null}

              {workoutsQuery.isError ? (
                <p className="text-destructive text-sm" role="alert">
                  {workoutsQuery.error instanceof Error
                    ? workoutsQuery.error.message
                    : "Failed to load workouts"}
                </p>
              ) : null}

              {!workoutsQuery.isLoading &&
              !workoutsQuery.isError &&
              items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No workouts yet. Create one from the app or via MCP.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </AppShellBody>
    </AppShellScroll>
  );
}
