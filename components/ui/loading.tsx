/**
 * Loading and skeleton helpers for route fallbacks, full-viewport blocking states, and in-view refetch overlays.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/ui/classes";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-surface-muted",
        className,
      )}
    />
  );
}

export function LoadingBar({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
    </div>
  );
}

export function LoadingSpinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-5 w-5 border-2" : size === "lg" ? "h-10 w-10 border-[3px]" : "h-8 w-8 border-[3px]";

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-border-strong border-t-primary",
        sizeClass,
        className,
      )}
      aria-hidden
    />
  );
}

/** Full content-area loader for route `loading.tsx` fallbacks. */
export function PageLoading({
  label = "Loading…",
  description = "Please wait while we prepare this page.",
  className,
}: {
  label?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex min-h-[min(28rem,70vh)] flex-col items-center justify-center gap-4 rounded-[28px] border border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <LoadingSpinner size="lg" />
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{label}</p>
        <p className="text-sm text-foreground-muted">{description}</p>
      </div>
    </div>
  );
}

/** Viewport-covering loader for sign-in and other blocking transitions. */
export function FullPageLoading({
  label = "Loading…",
  description = "Please wait while we prepare this page.",
}: {
  label?: string;
  description?: string;
}) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-canvas/90 px-4 backdrop-blur-sm">
      <PageLoading
        label={label}
        description={description}
        className="w-full max-w-md border-border bg-surface"
      />
    </div>
  );
}

/** Soft overlay on top of existing content during client refetch. */
export function LoadingOverlay({
  active,
  children,
  label = "Loading…",
  className,
}: {
  active: boolean;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {active ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-surface/70 backdrop-blur-[1px]"
        >
          <LoadingSpinner />
          <p className="text-sm font-medium text-foreground-muted">{label}</p>
        </div>
      ) : null}
    </div>
  );
}
