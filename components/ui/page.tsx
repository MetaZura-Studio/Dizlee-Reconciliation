import type { ReactNode } from "react";

import { cn, ui } from "@/lib/ui/classes";

export function PageCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn(ui.pageCard, className)}>{children}</section>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className={ui.pageTitle}>{title}</h1>
        {description ? <p className={ui.pageSubtitle}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function FilterToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(ui.filterToolbar, className)}>{children}</div>;
}
