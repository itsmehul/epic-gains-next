"use client";

import { Button } from "@/components/ui/button";
import type { PublicTrainerEscalation } from "@/features/agent/escalation";

export function TrainerEscalationCard({
  escalation,
  canRespond,
  pending = false,
  onRespond,
}: {
  escalation: PublicTrainerEscalation;
  canRespond: boolean;
  pending?: boolean;
  onRespond?: (approved: boolean) => void;
}) {
  const trainerLabel =
    escalation.trainers.length > 0
      ? escalation.trainers
          .map((trainer) => trainer.name || `@${trainer.username}`)
          .join(", ")
      : "your trainer";

  if (escalation.state === "approved") {
    return (
      <p className="text-muted-foreground mt-2 text-xs">
        {trainerLabel} was notified.
      </p>
    );
  }
  if (escalation.state === "denied") {
    return (
      <p className="text-muted-foreground mt-2 text-xs">
        Kept between you and the agent.
      </p>
    );
  }
  if (!canRespond || !onRespond) return null;

  return (
    <div className="bg-muted/50 mt-2 space-y-2 rounded-xl px-3 py-2.5 ring-1 ring-foreground/5">
      <p className="text-foreground text-xs font-medium">
        Ping {trainerLabel}?
      </p>
      <p className="text-muted-foreground text-xs leading-5 whitespace-pre-wrap">
        {escalation.preview}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="xs"
          disabled={pending}
          onClick={() => onRespond(true)}
        >
          Notify trainer
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() => onRespond(false)}
        >
          Don&apos;t ping
        </Button>
      </div>
    </div>
  );
}
