"use client";

import { IconChevronDown, IconLoader2, IconTrash } from "@tabler/icons-react";
import { motion, type Transition } from "motion/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/shared/utils";

export type SetRowPhase = "draft" | "approving" | "logged";

export type SetRowValues = {
  reps: string;
  weight: string;
  time: string;
  distance: string;
};

type SetRowCardProps = {
  rowKey: string;
  phase: SetRowPhase;
  summary: string;
  subtitle: string;
  expanded: boolean;
  busy: boolean;
  isEntering?: boolean;
  transition: Transition;
  onToggleExpanded: () => void;
  onApprove: () => void;
  onRemove: () => void;
  editor: React.ReactNode;
};

const springSnappy = { type: "spring" as const, stiffness: 520, damping: 36 };
const collapseGridClass =
  "grid transition-[grid-template-rows] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

export function SetRowCard({
  phase,
  summary,
  subtitle,
  expanded,
  busy,
  isEntering = false,
  transition,
  onToggleExpanded,
  onApprove,
  onRemove,
  editor,
}: SetRowCardProps) {
  const isDraft = phase === "draft";
  const isApproving = phase === "approving";
  const isLogged = phase === "logged";
  const isComplete = isApproving || isLogged;
  const editorOpen = isDraft && expanded && !isApproving;
  const checkboxChecked = isComplete;
  const canExpand = isDraft && !isApproving;
  const removeLabel = isDraft ? "Discard draft set" : "Delete set";

  return (
    <motion.li
      layout="position"
      initial={isEntering ? { opacity: 0, height: 0 } : false}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={transition}
      className={cn(
        "overflow-clip transition-[background-color] duration-280",
        isComplete && "bg-primary/8",
        editorOpen && "bg-muted/40",
      )}
    >
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              !canExpand && "cursor-default",
            )}
            aria-expanded={editorOpen}
            disabled={!canExpand}
            onClick={onToggleExpanded}
          >
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-sm font-medium tabular-nums transition-colors duration-280",
                  summary === "Tap to log" &&
                    isDraft &&
                    "text-muted-foreground font-normal",
                )}
              >
                {summary}
              </span>
              <span className="text-muted-foreground block text-[11px] tabular-nums transition-colors duration-280">
                {subtitle}
              </span>
            </span>
          </button>

          <div className="relative flex size-5 shrink-0 items-center justify-center">
            <Checkbox
              checked={checkboxChecked}
              disabled={!isDraft || isApproving || busy}
              aria-label={isDraft ? "Approve set" : "Set logged"}
              className="size-5 rounded-md transition-[background-color,border-color] duration-280 data-checked:bg-primary"
              onCheckedChange={(checked) => {
                if (checked && isDraft) onApprove();
              }}
            />
            {isApproving && busy ? (
              <IconLoader2
                aria-hidden
                className="text-primary pointer-events-none absolute inset-0 m-auto size-4 animate-spin"
              />
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={removeLabel}
            disabled={busy || isApproving}
            className={cn(
              "text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 px-0 transition-opacity duration-280",
              isApproving && "pointer-events-none opacity-40",
            )}
            onClick={onRemove}
          >
            {busy && isLogged ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconTrash className="size-4" />
            )}
          </Button>
        </div>

        <div
          className={cn(
            collapseGridClass,
            editorOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-clip" inert={!editorOpen}>
            {editor}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

export { IconChevronDown, springSnappy, collapseGridClass };
