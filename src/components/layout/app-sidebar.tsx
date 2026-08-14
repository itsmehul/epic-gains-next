"use client";

import { IconBarbell, IconUsers, IconX } from "@tabler/icons-react";
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
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors";

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
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
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
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1",
    !closeOnNavigate &&
      "outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2",
  );

  const content = (
    <>
      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_ICON} alt="" className="h-full w-full" aria-hidden />
      </span>
      <span className="min-w-0 truncate text-[15px] font-semibold leading-none tracking-tight text-sidebar-foreground [font-family:var(--font-heading)]">
        {APP_NAME}
      </span>
    </>
  );

  if (closeOnNavigate) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link className={className} href="/workouts">
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
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

      <div className="shrink-0 space-y-2 p-3">
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
      </div>

      <SidebarAccountFooter
        accountProfile={accountProfile}
        closeOnNavigate={showCloseButton}
      />
    </div>
  );
}

const sidebarSurfaceClassName =
  "bg-sidebar text-sidebar-foreground border-sidebar-border";

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
          "hidden h-full w-72 shrink-0 flex-col border-r md:flex",
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
