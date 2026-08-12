"use client";

import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";

import {
  AppShellBody,
  AppShellHeader,
  AppShellLoading,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFollowingFeed } from "@/features/social/hooks";
import { cn } from "@/shared/utils";

type DashboardPageClientProps = {
  userName: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function DashboardPageClient({ userName }: DashboardPageClientProps) {
  const feedQuery = useFollowingFeed();
  const items = feedQuery.data?.items ?? [];

  return (
    <AppShellScroll>
      <AppShellHeader title="Home" />
      <AppShellBody>
        <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:p-6">
          <p className="text-muted-foreground text-sm">
            Welcome back, {userName}. Workouts from people you follow show up
            here.
          </p>

          {feedQuery.isLoading ? (
            <AppShellLoading label="Loading feed…" />
          ) : null}

          {feedQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {feedQuery.error instanceof Error
                ? feedQuery.error.message
                : "Failed to load feed"}
            </p>
          ) : null}

          {!feedQuery.isLoading && !feedQuery.isError && items.length === 0 ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Your feed is empty. Follow friends to see their workouts.
              </p>
              <Link
                className="text-sm font-medium underline-offset-4 hover:underline"
                href="/friends"
              >
                Find friends
              </Link>
            </div>
          ) : null}

          {items.length > 0 ? (
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    className={cn(
                      "hover:bg-muted/50 flex items-center gap-3 px-1 py-3 transition-colors md:rounded-xl",
                    )}
                    href={`/workouts/${item.id}`}
                  >
                    <Avatar size="default">
                      {item.author.image ? (
                        <AvatarImage alt="" src={item.author.image} />
                      ) : null}
                      <AvatarFallback>
                        {initials(item.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{item.name}</p>
                      <p className="text-muted-foreground truncate text-sm">
                        @{item.author.username}
                        {item.createdAt
                          ? ` · ${formatWhen(item.createdAt)}`
                          : null}
                      </p>
                    </div>
                    <IconChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </AppShellBody>
    </AppShellScroll>
  );
}
