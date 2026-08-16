import { IconLoader2 } from "@/components/ui/icons"

import { cn } from "@/shared/utils"

function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <IconLoader2
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
