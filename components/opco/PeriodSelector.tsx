"use client";

import { useRouter } from "next/navigation";

import { FilterActions } from "@/components/ui/filter-actions";
import { getDefaultPeriod } from "@/lib/opco/period";
import {
  clampPeriodToPresent,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { cn, ui } from "@/lib/ui/classes";

type PeriodSelectorProps = {
  year: number;
  month: number;
  className?: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function PeriodSelector({ year, month, className }: PeriodSelectorProps) {
  const router = useRouter();
  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);
  const defaults = getDefaultPeriod();
  const isDefaultPeriod = year === defaults.year && month === defaults.month;

  function navigate(nextYear: number, nextMonth: number) {
    const next = clampPeriodToPresent(nextYear, nextMonth);
    router.push(`/opco?year=${next.year}&month=${next.month}`);
  }

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-end gap-3 sm:gap-4",
        className,
      )}
    >
      <label className="w-full text-sm sm:w-40">
        <span className={ui.label}>Month</span>
        <select
          value={month}
          onChange={(event) => navigate(year, Number(event.target.value))}
          className={ui.select}
        >
          {MONTHS.slice(0, maxMonth).map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="w-full text-sm sm:w-28">
        <span className={ui.label}>Year</span>
        <select
          value={year}
          onChange={(event) => navigate(Number(event.target.value), month)}
          className={ui.select}
        >
          {yearOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <FilterActions
        className="sm:ml-auto sm:w-auto"
        clearLabel="Clear filters"
        disabled={isDefaultPeriod}
        onClear={() => navigate(defaults.year, defaults.month)}
      />
    </div>
  );
}
