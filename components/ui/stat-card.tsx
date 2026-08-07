/**
 * Dashboard metric card with tonal gradient wash and optional navigation link.
 */

import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/ui/classes";

type StatTone = "blue" | "purple" | "teal" | "amber";

const toneWash: Record<StatTone, string> = {
  blue: "from-[#edf0ff] to-[#dfe6ff]",
  purple: "from-[#f3eeff] to-[#e8e0ff]",
  teal: "from-[#e8f7f5] to-[#d7f0ec]",
  amber: "from-[#fff7ed] to-[#ffedd5]",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "blue",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: StatTone;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full min-h-[7.5rem] flex-col rounded-[22px] bg-gradient-to-br p-4",
        toneWash[tone],
      )}
    >
      <p className="text-xs font-semibold tracking-wide text-foreground-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p
        className={cn(
          "mt-auto pt-1 text-xs",
          hint ? "text-foreground-subtle" : "invisible",
        )}
        aria-hidden={hint ? undefined : true}
      >
        {hint ?? "\u00a0"}
      </p>
    </div>
  );

  const shellClass =
    "block h-full rounded-[28px] border border-border bg-surface p-2 shadow-[var(--shadow-md)] transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(shellClass, "hover:bg-surface-muted/40")}>
        {inner}
      </Link>
    );
  }

  return <div className={shellClass}>{inner}</div>;
}

export function ToneCard({
  children,
  className,
  tone = "blue",
}: {
  children: ReactNode;
  className?: string;
  tone?: StatTone;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-border bg-surface p-2 shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-[22px] bg-gradient-to-br p-5",
          toneWash[tone],
        )}
      >
        {children}
      </div>
    </div>
  );
}
