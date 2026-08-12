"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SocialUser } from "@/features/social/types";
import { cn } from "@/shared/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserListRow({
  user,
  trailing,
  className,
}: {
  user: SocialUser;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 md:rounded-xl md:px-3",
        className,
      )}
    >
      <Link
        className="flex min-w-0 flex-1 items-center gap-3"
        href={`/u/${user.username}`}
      >
        <Avatar size="default">
          {user.image ? <AvatarImage alt="" src={user.image} /> : null}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium leading-snug">{user.name}</p>
          <p className="text-muted-foreground truncate text-sm">
            @{user.username}
          </p>
        </div>
      </Link>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
