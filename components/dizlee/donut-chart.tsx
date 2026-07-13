import Link from "next/link";

import type { DonutSegment } from "@/lib/dizlee/dashboard";

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#db2777",
  "#7c3aed",
  "#0891b2",
  "#dc2626",
  "#65a30d",
];

type DonutChartProps = {
  title: string;
  segments: DonutSegment[];
  formatValue?: (value: number) => string;
  getSegmentHref?: (segment: DonutSegment) => string | undefined;
};

export function DonutChart({
  title,
  segments,
  formatValue,
  getSegmentHref,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const format = formatValue ?? ((value: number) => value.toLocaleString());

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <p className="text-sm font-medium text-foreground-muted">{title}</p>
      {total <= 0 ? (
        <p className="mt-6 text-sm text-foreground-subtle">No data yet.</p>
      ) : (
        <div className="mt-4 flex items-center gap-6">
          <svg
            viewBox="0 0 36 36"
            className="h-28 w-28 shrink-0"
            role="img"
            aria-label={title}
          >
            {(() => {
              let offset = 0;
              return segments.map((segment, index) => {
                const percent = (segment.value / total) * 100;
                const circle = (
                  <circle
                    key={segment.id ?? segment.label}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke={PALETTE[index % PALETTE.length]}
                    strokeWidth="4"
                    strokeDasharray={`${percent} ${100 - percent}`}
                    strokeDashoffset={25 - offset}
                  />
                );
                offset += percent;
                return circle;
              });
            })()}
          </svg>
          <ul className="min-w-0 flex-1 space-y-1 text-sm">
            {segments.map((segment, index) => {
              const href = getSegmentHref?.(segment);
              const valueLabel = format(segment.value);
              const row = (
                <>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                    />
                    <span className="truncate text-foreground-muted">
                      {segment.label}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {valueLabel}
                  </span>
                </>
              );

              return (
                <li key={segment.id ?? segment.label}>
                  {href ? (
                    <Link
                      href={href}
                      className="flex items-center justify-between gap-3 underline-offset-2 hover:underline"
                      title={`View details for ${segment.label}`}
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
