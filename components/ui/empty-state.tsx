import type { ReactNode } from "react";

import { cn, ui } from "@/lib/ui/classes";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(ui.emptyState, className)}>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
