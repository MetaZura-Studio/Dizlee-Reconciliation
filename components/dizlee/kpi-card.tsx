import { StatCard } from "@/components/ui/stat-card";

type KpiCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "blue" | "purple" | "teal" | "amber";
};

export function KpiCard({
  label,
  value,
  hint,
  href,
  tone = "blue",
}: KpiCardProps) {
  return (
    <StatCard label={label} value={value} hint={hint} href={href} tone={tone} />
  );
}
