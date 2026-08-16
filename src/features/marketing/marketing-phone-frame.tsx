"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/shared/utils";

/** Logical mobile viewport width mocks are authored at. */
export const MOBILE_MOCK_VIEWPORT_WIDTH = 390;

/** Default scale for the standard 280px phone frame (264px inner content). */
export const MOBILE_MOCK_DEFAULT_SCALE = 264 / MOBILE_MOCK_VIEWPORT_WIDTH;

function MockMobileScale({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MOBILE_MOCK_DEFAULT_SCALE);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateScale = () => {
      const width = element.clientWidth;
      if (width > 0) {
        setScale(width / MOBILE_MOCK_VIEWPORT_WIDTH);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full origin-top-left"
        style={{
          width: MOBILE_MOCK_VIEWPORT_WIDTH,
          height: scale > 0 ? `calc(100% / ${scale})` : "100%",
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StatusBarBattery() {
  return (
    <svg
      aria-hidden
      className="text-foreground"
      fill="none"
      height="11"
      viewBox="0 0 25 11"
      width="25"
    >
      <rect
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
        width="21"
        x="0.5"
        y="0.75"
      />
      <rect
        fill="currentColor"
        height="6.5"
        rx="1"
        width="16"
        x="2.25"
        y="2.25"
      />
      <path
        d="M23 3.5v4c.83-.3 1.5-1.1 1.5-2s-.67-1.7-1.5-2Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

export function MarketingPhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative mx-auto w-[min(100%,280px)] max-w-full shrink-0",
        className,
      )}
    >
      <div className="rounded-[2.75rem] border border-neutral-800 bg-neutral-950 p-2 shadow-2xl shadow-black/25">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-neutral-950">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[11px]">
            <div className="h-[26px] w-[92px] rounded-full bg-neutral-950" />
          </div>

          <div className="relative aspect-[9/19.5] overflow-hidden bg-background text-foreground">
            <div className="flex h-full flex-col">
              <div className="pointer-events-none relative z-10 flex h-11 shrink-0 items-center justify-between px-6 pt-1">
                <span className="min-w-10 text-[13px] leading-none font-semibold tracking-tight tabular-nums text-foreground">
                  9:41
                </span>
                <StatusBarBattery />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden overscroll-y-contain">
                <MockMobileScale>{children}</MockMobileScale>
              </div>
              <div className="pointer-events-none flex h-5 shrink-0 items-center justify-center pb-1">
                <div className="h-1 w-24 rounded-full bg-foreground/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
