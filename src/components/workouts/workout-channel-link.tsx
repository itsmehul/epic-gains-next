import { IconExternalLink } from "@tabler/icons-react";

import { cn } from "@/shared/utils";

export function WorkoutChannelLink({
  author,
  channelUrl,
  className,
}: {
  author: string | null | undefined;
  channelUrl: string | null | undefined;
  className?: string;
}) {
  const label = author?.trim() || "YouTube channel";
  if (!author?.trim() && !channelUrl) return null;

  if (channelUrl) {
    return (
      <a
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1 hover:underline",
          className,
        )}
      >
        <span className="truncate">{label}</span>
        <IconExternalLink aria-hidden className="size-3.5 shrink-0" />
      </a>
    );
  }

  return <span className={className}>{label}</span>;
}
