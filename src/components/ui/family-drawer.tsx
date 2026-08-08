"use client"

import { Slot } from "@radix-ui/react-slot";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import useMeasure from "react-use-measure";
import { Drawer } from "vaul";

// ============================================================================
// Types
// ============================================================================

type ViewComponent = React.ComponentType<Record<string, unknown>>

interface ViewsRegistry {
  [viewName: string]: ViewComponent
}

// ============================================================================
// Context
// ============================================================================

interface FamilyDrawerContextValue {
  isOpen: boolean
  view: string
  setView: (view: string) => void
  opacityDuration: number
  elementRef: ReturnType<typeof useMeasure>[0]
  bounds: ReturnType<typeof useMeasure>[1]
  views: ViewsRegistry | undefined
}

const FamilyDrawerContext = createContext<FamilyDrawerContextValue | undefined>(
  undefined
)

function useFamilyDrawer() {
  const context = useContext(FamilyDrawerContext)
  if (!context) {
    throw new Error(
      "FamilyDrawer components must be used within FamilyDrawerRoot"
    )
  }
  return context
}

// ============================================================================
// Root Component
// ============================================================================

interface FamilyDrawerRootProps {
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  defaultView?: string
  onViewChange?: (view: string) => void
  views?: ViewsRegistry
}

function FamilyDrawerRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  defaultView = "default",
  onViewChange,
  views: customViews,
}: FamilyDrawerRootProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [view, setView] = useState(defaultView)
  const [elementRef, bounds] = useMeasure()
  const previousHeightRef = useRef(0)
  const [opacityDuration, setOpacityDuration] = useState(0.08)

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const setIsOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setView(defaultView)
      onViewChange?.(defaultView)
    }

    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  useEffect(() => {
    const currentHeight = bounds.height
    const previousHeight = previousHeightRef.current

    const MIN_DURATION = 0.08
    const MAX_DURATION = 0.15

    if (!previousHeight) {
      previousHeightRef.current = currentHeight
      setOpacityDuration(MIN_DURATION)
      return
    }

    const heightDifference = Math.abs(currentHeight - previousHeight)
    previousHeightRef.current = currentHeight

    setOpacityDuration(
      Math.min(
        Math.max(heightDifference / 500, MIN_DURATION),
        MAX_DURATION
      )
    )
  }, [bounds.height])

  const handleViewChange = (newView: string) => {
    setView(newView)
    onViewChange?.(newView)
  }

  // Use custom views if provided, otherwise pass undefined
  const views =
    customViews && Object.keys(customViews).length > 0 ? customViews : undefined

  const contextValue: FamilyDrawerContextValue = {
    isOpen,
    view,
    setView: handleViewChange,
    opacityDuration,
    elementRef,
    bounds,
    views,
  }

  return (
    <FamilyDrawerContext.Provider value={contextValue}>
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        {children}
      </Drawer.Root>
    </FamilyDrawerContext.Provider>
  )
}

// ============================================================================
// Trigger Component
// ============================================================================

interface FamilyDrawerTriggerProps {
  children: ReactNode
  asChild?: boolean
  className?: string
}

function FamilyDrawerTrigger({
  children,
  asChild = false,
  className,
}: FamilyDrawerTriggerProps) {
  if (asChild) {
    return (
      <Drawer.Trigger asChild>
        <Slot>{children}</Slot>
      </Drawer.Trigger>
    )
  }

  return (
    <Drawer.Trigger asChild>
      <button
        className={clsx(
          "fixed top-1/2 left-1/2 antialiased -translate-y-1/2 -translate-x-1/2 h-8 rounded-lg border bg-background px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:shadow-focus-ring-button cursor-pointer",
          className
        )}
        type="button"
      >
        {children}
      </button>
    </Drawer.Trigger>
  )
}

// ============================================================================
// Portal Component
// ============================================================================

function FamilyDrawerPortal({ children }: { children: ReactNode }) {
  return <Drawer.Portal>{children}</Drawer.Portal>
}

// ============================================================================
// Overlay Component
// ============================================================================

interface FamilyDrawerOverlayProps {
  className?: string
  onClick?: () => void
}

function FamilyDrawerOverlay({ className, onClick }: FamilyDrawerOverlayProps) {
  const { setView } = useFamilyDrawer()

  return (
    <Drawer.Overlay
      className={clsx("fixed inset-0 z-50 bg-black/30", className)}
      onClick={onClick || (() => setView("default"))}
    />
  )
}

// ============================================================================
// Content Component
// ============================================================================

interface FamilyDrawerContentProps {
  children: ReactNode
  className?: string
  asChild?: boolean
}

function FamilyDrawerContent({
  children,
  className,
  asChild = false,
}: FamilyDrawerContentProps) {
  const { bounds } = useFamilyDrawer()

  const maxHeight =
    typeof window !== "undefined" ? window.innerHeight * 0.95 : undefined

  const content = (
    <motion.div
      animate={{
        height: maxHeight
          ? Math.min(bounds.height || 0, maxHeight)
          : bounds.height,
        transition: {
          duration: 0.15,
          ease: [0.25, 1, 0.5, 1],
        },
      }}
    >
      {children}
    </motion.div>
  )

  if (asChild) {
    return (
      <Drawer.Content
        asChild
        className={clsx(
          "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm overflow-hidden rounded-2xl bg-background outline-none ring-1 ring-foreground/10 md:mx-auto md:w-full",
          className
        )}
      >
        <Slot>{content}</Slot>
      </Drawer.Content>
    )
  }

  return (
    <Drawer.Content
      asChild
      className={clsx(
        "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm overflow-hidden rounded-2xl bg-background outline-none ring-1 ring-foreground/10 md:mx-auto md:w-full",
        className
      )}
    >
      {content}
    </Drawer.Content>
  )
}

// ============================================================================
// Animated Wrapper Component
// ============================================================================

interface FamilyDrawerAnimatedWrapperProps {
  children: ReactNode
  className?: string
}

function FamilyDrawerAnimatedWrapper({
  children,
  className,
}: FamilyDrawerAnimatedWrapperProps) {
  const { elementRef } = useFamilyDrawer()

  return (
    <div
      ref={elementRef}
      className={clsx(
        "flex max-h-[95vh] flex-col overflow-hidden px-4 pb-4 pt-2 antialiased",
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Animated Content Component
// ============================================================================

function FamilyDrawerAnimatedContent() {
  const { view, opacityDuration } = useFamilyDrawer()

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        key={view}
        transition={{
          duration: opacityDuration,
          ease: [0.26, 0.08, 0.25, 1],
        }}
        className="flex max-h-full min-h-0 flex-col overflow-hidden"
      >
        <FamilyDrawerViewContent viewName={view} />
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// Body Component (scrollable region between sticky header/footer)
// ============================================================================

interface FamilyDrawerBodyProps {
  children: ReactNode
  className?: string
}

function FamilyDrawerBody({ children, className }: FamilyDrawerBodyProps) {
  return (
    <div className={clsx("min-h-0 flex-1 overflow-y-auto", className)}>
      {children}
    </div>
  )
}

// ============================================================================
// Close Component
// ============================================================================

interface FamilyDrawerCloseProps {
  children?: ReactNode
  asChild?: boolean
  className?: string
}

function FamilyDrawerClose({
  children,
  asChild = false,
  className,
}: FamilyDrawerCloseProps) {
  const defaultClose = (
    <button
      data-vaul-no-drag=""
      className={clsx(
        "absolute right-4 top-3 z-10 flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:shadow-focus-ring-button active:scale-75 cursor-pointer",
        className
      )}
      type="button"
    >
      {children || <CloseIcon />}
    </button>
  )

  if (asChild) {
    return (
      <Drawer.Close asChild>
        <Slot>{defaultClose}</Slot>
      </Drawer.Close>
    )
  }

  return <Drawer.Close asChild>{defaultClose}</Drawer.Close>
}

// ============================================================================
// Helper Components
// ============================================================================

interface FamilyDrawerHeaderProps {
  icon: ReactNode
  title: string
  className?: string
}

function FamilyDrawerHeader({
  icon,
  title,
  className,
}: FamilyDrawerHeaderProps) {
  return (
    <header className={clsx("my-1 shrink-0", className)}>
      <div className="flex h-5 items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground [&_svg]:size-3.5">
          {icon}
        </span>
        <h2 className="truncate text-sm font-medium leading-5 tracking-tight text-foreground">
          {title}
        </h2>
      </div>
    </header>
  )
}

interface FamilyDrawerFooterProps {
  children: ReactNode
  className?: string
}

function FamilyDrawerFooter({ children, className }: FamilyDrawerFooterProps) {
  return (
    <div className={clsx("mt-3 flex shrink-0 gap-3", className)}>{children}</div>
  )
}

interface FamilyDrawerButtonProps {
  children: ReactNode
  onClick: () => void
  className?: string
  asChild?: boolean
}

function FamilyDrawerButton({
  children,
  onClick,
  className,
  asChild = false,
}: FamilyDrawerButtonProps) {
  const button = (
    <button
      data-vaul-no-drag=""
      className={clsx(
        "flex h-9 w-full items-center gap-2.5 rounded-lg bg-muted px-3 text-sm font-medium text-foreground transition-transform focus:scale-95 focus-visible:shadow-focus-ring-button active:scale-95 cursor-pointer",
        className
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )

  if (asChild) {
    return <Slot>{button}</Slot>
  }

  return button
}

interface FamilyDrawerSecondaryButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  asChild?: boolean
  type?: "button" | "submit" | "reset"
  form?: string
  disabled?: boolean
}

function FamilyDrawerSecondaryButton({
  children,
  onClick,
  className,
  asChild = false,
  type = "button",
  form,
  disabled = false,
}: FamilyDrawerSecondaryButtonProps) {
  const button = (
    <button
      data-vaul-no-drag=""
      type={type}
      form={form}
      disabled={disabled}
      className={clsx(
        "flex h-8 w-full items-center justify-center gap-2 rounded-full text-center text-sm font-medium transition-transform focus:scale-95 focus-visible:shadow-focus-ring-button active:scale-95 cursor-pointer disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )

  if (asChild) {
    return <Slot>{button}</Slot>
  }

  return button
}

// ============================================================================
// View Content Renderer
// ============================================================================

interface FamilyDrawerViewContentProps {
  views?: ViewsRegistry
  /** Pins the rendered view for AnimatePresence exit layers. */
  viewName?: string
}

function FamilyDrawerViewContent(
  {
    views: propViews,
    viewName,
  }: FamilyDrawerViewContentProps = {} as FamilyDrawerViewContentProps
) {
  const { view: contextView, views: contextViews } = useFamilyDrawer()
  const view = viewName ?? contextView

  // Use prop views first, then context views
  const views = propViews || contextViews

  if (!views) {
    throw new Error(
      "FamilyDrawerViewContent requires views to be provided via props or FamilyDrawerRoot"
    )
  }

  const ViewComponent = views[view]

  if (!ViewComponent) {
    // Fallback to default view if view not found
    const DefaultComponent = views.default
    return DefaultComponent ? <DefaultComponent /> : null
  }

  return <ViewComponent />
}

// ============================================================================
// Icons
// ============================================================================

function CloseIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Close Icon</title>
      <path
        d="M10.4854 1.99998L2.00007 10.4853"
        stroke="#999999"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.4854 10.4844L2.00007 1.99908"
        stroke="#999999"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================================
// Exports
// ============================================================================

export {
  FamilyDrawerAnimatedContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerBody,
  FamilyDrawerButton,
  FamilyDrawerClose,
  FamilyDrawerContent,
  FamilyDrawerFooter,
  FamilyDrawerHeader,
  FamilyDrawerOverlay,
  FamilyDrawerPortal,
  FamilyDrawerRoot,
  FamilyDrawerSecondaryButton,
  FamilyDrawerTrigger,
  FamilyDrawerViewContent,
  useFamilyDrawer,
  type ViewComponent,
  type ViewsRegistry
};
