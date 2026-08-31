"use client";

import { IconNotifications } from "@/components/ui/icons";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SheetClose } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  useMarkNotificationsRead,
  useNotifications,
} from "@/features/notifications/hooks";
import type { MentionNotification } from "@/features/notifications/types";
import { cn } from "@/shared/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function NotificationRow({
  item,
  closeOnNavigate,
  onOpen,
}: {
  item: MentionNotification;
  closeOnNavigate: boolean;
  onOpen: (item: MentionNotification) => void;
}) {
  const unread = item.readAt == null;
  const preview =
    item.comment.text.length > 80
      ? `${item.comment.text.slice(0, 80).trim()}…`
      : item.comment.text;
  const context = item.workout
    ? `${item.exercise.name} · ${item.workout.name}`
    : item.exercise.name;
  const when = formatRelativeTime(item.createdAt);

  const className = cn(
    "flex w-full gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
    unread
      ? "bg-sidebar-accent/55 hover:bg-sidebar-accent/80"
      : "hover:bg-sidebar-accent/40",
  );

  const body = (
    <>
      <Avatar size="sm" className="mt-0.5">
        {item.actor.image ? (
          <AvatarImage src={item.actor.image} alt="" />
        ) : null}
        <AvatarFallback>{initials(item.actor.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="text-sidebar-foreground block text-[13px] leading-5">
          <span className="font-medium">{item.actor.name}</span>
          <span className="text-sidebar-foreground/70"> mentioned you</span>
        </span>
        <span className="text-sidebar-foreground/55 mt-0.5 block truncate text-[12px]">
          {preview}
        </span>
        <span className="text-sidebar-foreground/45 mt-0.5 flex items-center gap-1.5 text-[11px]">
          <span className="truncate">{context}</span>
          {when ? (
            <>
              <span aria-hidden>·</span>
              <time dateTime={item.createdAt} className="shrink-0 tabular-nums">
                {when}
              </time>
            </>
          ) : null}
        </span>
      </span>
      {unread ? (
        <span
          className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (item.href) {
    const linkProps = {
      className,
      href: item.href,
      onClick: () => onOpen(item),
    };
    if (closeOnNavigate) {
      return (
        <SheetClose render={<Link {...linkProps} />}>{body}</SheetClose>
      );
    }
    return <Link {...linkProps}>{body}</Link>;
  }

  return (
    <button type="button" className={className} onClick={() => onOpen(item)}>
      {body}
    </button>
  );
}

export function SidebarNotificationsButton({
  closeOnNavigate = false,
}: {
  closeOnNavigate?: boolean;
}) {
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const items = notifications.data?.items ?? [];
  const unreadCount = notifications.data?.unreadCount ?? 0;

  const handleOpen = (item: MentionNotification) => {
    if (item.readAt == null) {
      markRead.mutate({ ids: [item.id] });
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="relative shrink-0 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            size="icon-sm"
            variant="ghost"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          />
        }
      >
        <IconNotifications className="size-4" />
        {unreadCount > 0 ? (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-80 gap-0 p-0"
      >
        <PopoverHeader className="flex-row items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
          <PopoverTitle className="text-sm">Notifications</PopoverTitle>
          {unreadCount > 0 ? (
            <Button
              size="xs"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => markRead.mutate({ all: true })}
              disabled={markRead.isPending}
            >
              Mark all read
            </Button>
          ) : null}
        </PopoverHeader>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {notifications.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">
              No mentions yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <NotificationRow
                    item={item}
                    closeOnNavigate={closeOnNavigate}
                    onOpen={handleOpen}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
