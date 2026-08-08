"use client";

import { IconLoader2, IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AccountSidebarProfile } from "@/components/layout/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/infrastructure/auth/client";

type SidebarAccountFooterProps = {
  accountProfile: AccountSidebarProfile;
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
}: SidebarAccountFooterProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

        <div className="border-t border-sidebar-border/45 px-3 py-2">
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
