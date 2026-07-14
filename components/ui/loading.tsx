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
