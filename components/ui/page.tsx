/**
 * Page shell primitives: card container, title/subtitle header, and layout modes.
 * Shared across Admin, Dizlee, OpCo, and Partner portals.
 */

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
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4 pr-16 sm:mb-6 sm:pr-20">
      <div className="min-w-0 max-w-3xl">
        <h1 className={ui.pageTitle}>{title}</h1>
        {description ? (
          <p className={ui.pageSubtitle}>{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function PageStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(ui.pageStack, className)}>{children}</div>;
}

export function FormLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(ui.formLayout, className)}>{children}</div>;
}

export function DataLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(ui.dataLayout, className)}>{children}</div>;
}

export function PageSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(ui.sectionCard, className)}>
      {title || description ? (
        <div className="mb-4 space-y-1">
          {title ? (
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          ) : null}
          {description ? (
            <p className="text-sm text-foreground-muted">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function HelpPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn(ui.helpPanel, className)}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-2.5">{children}</div>
    </aside>
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
