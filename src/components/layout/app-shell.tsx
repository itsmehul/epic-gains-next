"use client";

import { IconArrowLeft, IconLayoutSidebar } from "@tabler/icons-react";
import Link from "next/link";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  AppSidebar,
  type AccountSidebarProfile,
} from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

type AppShellContextValue = {
  onOpenSidebar: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within AppShell");
  }
  return context;
}

type AppShellProps = {
  accountProfile: AccountSidebarProfile;
  children: ReactNode;
};

export function AppShell({ accountProfile, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const contextValue: AppShellContextValue = {
    onOpenSidebar: () => setSidebarOpen(true),
    sidebarOpen,
    toggleSidebar: () => setSidebarOpen((current) => !current),
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="flex h-dvh min-h-0">
        <AppSidebar
          accountProfile={accountProfile}
          onOpenChange={setSidebarOpen}
          open={sidebarOpen}
        />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-content-panel">
          {children}
        </div>
      </div>
    </AppShellContext.Provider>
  );
}

type AppShellScrollProps = {
  children: ReactNode;
  className?: string;
};

export function AppShellScroll({ children, className }: AppShellScrollProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto bg-content-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

type AppShellHeaderProps = {
  actions?: ReactNode;
  backHref?: string;
  onBack?: () => void;
  title: ReactNode;
};

export function AppShellHeader({
  actions,
  backHref,
  onBack,
  title,
}: AppShellHeaderProps) {
  const { sidebarOpen, toggleSidebar } = useAppShell();

  return (
    <header className="sticky top-0 z-20 w-full shrink-0 bg-content-panel shadow-[0_4px_8px_-4px_oklch(0_0_0/0.1)] dark:shadow-[0_4px_8px_-4px_oklch(0_0_0/0.4)]">
      <div className="flex h-12 items-center gap-2 px-3 md:h-14 md:px-6">
        {onBack ? (
          <Button
            aria-label="Back"
            className="-ml-1"
            onClick={onBack}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <IconArrowLeft className="size-4" />
          </Button>
        ) : backHref ? (
          <Button
            aria-label="Back"
            className="-ml-1"
            nativeButton={false}
            render={<Link href={backHref} />}
            size="icon-sm"
            variant="ghost"
          >
            <IconArrowLeft className="size-4" />
          </Button>
        ) : (
          <Button
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="-ml-1 md:hidden"
            onClick={toggleSidebar}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <IconLayoutSidebar className="size-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          {typeof title === "string" ? (
            <h1 className="truncate rounded-full py-0 pr-4 text-base font-semibold tracking-tight md:py-1">
              {title}
            </h1>
          ) : (
            title
          )}
        </div>
        <div className="flex flex-1 items-center justify-end">
          {actions ? (
            <div className="ml-2 flex shrink-0 items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
