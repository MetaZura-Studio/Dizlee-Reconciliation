"use client";

import { useRouter } from "next/navigation";

import {
  clampPeriodToPresent,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";

type PeriodSelectorProps = {
  year: number;
  month: number;
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

export function PeriodSelector({ year, month }: PeriodSelectorProps) {
  const router = useRouter();
  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  function navigate(nextYear: number, nextMonth: number) {
    const next = clampPeriodToPresent(nextYear, nextMonth);
    router.push(`/opco?year=${next.year}&month=${next.month}`);
  }

  return (
    <div className="flex items-end gap-3">
      <label className="w-36 text-sm">
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
      <label className="w-28 text-sm">
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
    </div>
  );
}
