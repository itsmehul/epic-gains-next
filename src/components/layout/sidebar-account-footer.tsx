"use client";

import {
  IconLoader2,
  IconLogout,
  IconMoon,
  IconPlugConnected,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import type { AccountSidebarProfile } from "@/components/layout/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { signOut } from "@/infrastructure/auth/client";
import { cn } from "@/shared/utils";

type SidebarAccountFooterProps = {
  accountProfile: AccountSidebarProfile;
  closeOnNavigate?: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarAccountFooter({
  accountProfile,
  closeOnNavigate = false,
}: SidebarAccountFooterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    setIsThemeReady(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const integrationsActive = pathname.startsWith("/integrations");

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  };

  const integrationsClassName = cn(
    buttonVariants({ size: "sm", variant: "ghost" }),
    "w-full justify-start gap-2",
    integrationsActive
      ? "bg-sidebar-accent/70 font-medium text-sidebar-foreground"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
  );

  const integrationsLink = closeOnNavigate ? (
    <SheetClose
      render={<Link className={integrationsClassName} href="/integrations" />}
    >
      <IconPlugConnected className="size-3.5" />
      Integrations
    </SheetClose>
  ) : (
    <Link className={integrationsClassName} href="/integrations">
      <IconPlugConnected className="size-3.5" />
      Integrations
    </Link>
  );

  return (
    <div className="mt-auto shrink-0 p-3">
      <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-linear-to-b from-sidebar-primary/8 via-sidebar-accent/35 to-sidebar-accent/55 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.05)]">
        <div className="flex items-center gap-2.5 px-3 py-3">
          <Avatar
            className="size-7 shrink-0 ring-2 ring-sidebar-border/80"
            size="sm"
          >
            {accountProfile.pictureUrl ? (
              <AvatarImage
                alt={accountProfile.name}
                src={accountProfile.pictureUrl}
              />
            ) : null}
            <AvatarFallback className="bg-sidebar-primary/15 text-[10px] font-semibold text-sidebar-primary">
              {getInitials(accountProfile.name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground">
            {accountProfile.name}
          </span>
        </div>

        <div className="space-y-0.5 border-t border-sidebar-border/45 px-3 py-2">
          {integrationsLink}
          <Button
            className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            disabled={!isThemeReady}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <IconMoon className="size-3.5" />
            <span className="min-w-0 flex-1 text-left">Dark mode</span>
            <Switch
              aria-hidden
              checked={isThemeReady ? isDark : false}
              className="pointer-events-none"
              size="sm"
              tabIndex={-1}
            />
          </Button>
          <Button
            className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            disabled={isSigningOut}
            onClick={handleSignOut}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isSigningOut ? (
              <IconLoader2 className="size-3.5 animate-spin" />
            ) : (
              <IconLogout className="size-3.5" />
            )}
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
