import { IconCheck } from "@/components/ui/icons";

import { cn } from "@/shared/utils";

export function AchievementProgressPie({
  unlocked,
  total,
  className,
}: {
  unlocked: number;
  total: number;
  className?: string;
}) {
  const safeTotal = Math.max(total, 1);
  const t = Math.min(Math.max(unlocked / safeTotal, 0), 1);
  const radius = 10;
  const center = 12;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + t * 2 * Math.PI;
  const x1 = center + radius * Math.cos(startAngle);
  const y1 = center + radius * Math.sin(startAngle);
  const x2 = center + radius * Math.cos(endAngle);
  const y2 = center + radius * Math.sin(endAngle);
  const largeArc = t > 0.5 ? 1 : 0;
  const wedge = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  const complete = total > 0 && unlocked >= total;

  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full bg-black/75 text-white shadow-sm ring-1 ring-white/20",
        className,
      )}
      aria-label={`${unlocked} of ${total} workout achievements unlocked`}
    >
      {complete ? (
        <IconCheck className="size-4" stroke={2.4} />
      ) : (
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
          <circle cx={center} cy={center} r={radius} className="fill-white/20" />
          {t > 0 ? <path d={wedge} className="fill-white" /> : null}
        </svg>
      )}
    </span>
  );
}
