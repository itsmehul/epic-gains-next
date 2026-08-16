import * as React from "react"

import { cn } from "@/shared/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-sm border-0 border-b border-border bg-surface-container-highest px-4 py-3 text-base transition-[color,box-shadow,background-color] duration-[var(--dur-short)] ease-[var(--ease-standard)] outline-none placeholder:text-muted-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
