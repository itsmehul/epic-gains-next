"use client";

import { IconBarbell, IconSparkles, IconTrophy, IconUsers, IconX } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SidebarAccountFooter } from "@/components/layout/sidebar-account-footer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { APP_NAME, BRAND_ICON } from "@/shared/pwa/constants";
import { cn } from "@/shared/utils";

export type AccountSidebarProfile = {
  name: string;
  pictureUrl: string | null;
};

type AppSidebarContentProps = {
  accountProfile: AccountSidebarProfile;
  showCloseButton?: boolean;
};

type AppSidebarProps = AppSidebarContentProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const sidebarNavItemClassName =
  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.2,0,0,1)]";

function SidebarNavItem({
  active,
  children,
  closeOnNavigate = false,
  href,
}: {
  active: boolean;
  children: ReactNode;
  closeOnNavigate?: boolean;
  href: string;
}) {
  const className = cn(
    sidebarNavItemClassName,
    active
      ? "bg-sidebar-accent/80 font-medium text-sidebar-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
  );

  if (closeOnNavigate) {
    return (
      <SheetClose render={<Link className={className} href={href} />}>
        {children}
      </SheetClose>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function SidebarBrand({ closeOnNavigate = false }: { closeOnNavigate?: boolean }) {
  const className = cn(
    "group/brand flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5",
    !closeOnNavigate &&
      "outline-none ring-sidebar-ring focus-visible:ring-2",
  );

  const content = (
    <>
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sidebar-accent/70 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--sidebar-primary)_28%,transparent)] ring-1 ring-black/5 transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-hover/brand:scale-[1.04] dark:ring-white/8">
        <Image
          src={BRAND_ICON}
          alt=""
          width={36}
          height={36}
          className="size-9 object-cover"
          aria-hidden
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-heading text-[15px] font-semibold leading-none tracking-[-0.03em] text-sidebar-foreground">
          {APP_NAME}
        </span>
        <span className="mt-1 truncate text-[11px] font-medium leading-none tracking-wide text-sidebar-foreground/45">
          Log every lift
        </span>
      </span>
    </>
  );

  if (closeOnNavigate) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link aria-label={`${APP_NAME} home`} className={className} href="/workouts">
      {content}
    </Link>
  );
}

function AppSidebarContent({
  accountProfile,
  showCloseButton = false,
}: AppSidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--sidebar-primary)_8%,transparent)_0%,transparent_38%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-0 size-40 rounded-full bg-sidebar-primary/8 blur-3xl"
      />

      <div className="relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/70 px-3.5">
        <SidebarBrand closeOnNavigate={showCloseButton} />
        {showCloseButton ? (
          <SheetClose
            render={
              <Button
                className="shrink-0 bg-secondary"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <IconX strokeWidth={2} />
            <span className="sr-only">Close</span>
          </SheetClose>
        ) : null}
      </div>

      <div className="relative shrink-0 space-y-1.5 p-3">
        <SidebarNavItem
          active={pathname.startsWith("/workouts")}
          closeOnNavigate={showCloseButton}
          href="/workouts"
        >
          <IconBarbell className="size-4 shrink-0" />
          Workouts
        </SidebarNavItem>
        <SidebarNavItem
          active={pathname.startsWith("/friends") || pathname.startsWith("/u/")}
          closeOnNavigate={showCloseButton}
          href="/friends"
        >
          <IconUsers className="size-4 shrink-0" />
          Friends
        </SidebarNavItem>
        <SidebarNavItem
          active={pathname.startsWith("/achievements")}
          closeOnNavigate={showCloseButton}
          href="/achievements"
        >
          <IconTrophy className="size-4 shrink-0" />
          Achievements
        </SidebarNavItem>
        <SidebarNavItem
          active={pathname.startsWith("/skills")}
          closeOnNavigate={showCloseButton}
          href="/skills"
        >
          <IconSparkles className="size-4 shrink-0" />
          Skills
        </SidebarNavItem>
      </div>

      <div className="relative mt-auto min-h-0">
        <SidebarAccountFooter
          accountProfile={accountProfile}
          closeOnNavigate={showCloseButton}
        />
      </div>
    </div>
  );
}

const sidebarSurfaceClassName =
  "isolate overflow-hidden bg-sidebar text-sidebar-foreground border-sidebar-border";

export function AppSidebar({
  accountProfile,
  onOpenChange,
  open,
}: AppSidebarProps) {
  const contentProps = { accountProfile };

  return (
    <>
      <aside
        className={cn(
          "relative hidden h-full w-72 shrink-0 flex-col border-r md:flex",
          sidebarSurfaceClassName,
        )}
      >
        <AppSidebarContent {...contentProps} />
      </aside>

      <Sheet modal={false} onOpenChange={onOpenChange} open={open}>
        <SheetContent
          className={cn(
            "gap-0 p-0 md:hidden",
            "!w-72 !max-w-[min(18rem,92vw)]",
            sidebarSurfaceClassName,
          )}
          overlayClassName="md:hidden"
          showCloseButton={false}
          side="left"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebarContent {...contentProps} showCloseButton />
        </SheetContent>
      </Sheet>
    </>
  );
}
