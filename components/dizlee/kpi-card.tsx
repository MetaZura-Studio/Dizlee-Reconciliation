import Link from "next/link";

type KpiCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
};

export function KpiCard({ label, value, hint, href }: KpiCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-foreground-subtle">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground-subtle">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors hover:border-border-strong hover:bg-surface-muted"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      {content}
    </div>
  );
}
