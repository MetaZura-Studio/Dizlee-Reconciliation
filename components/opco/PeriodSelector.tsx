"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/field";
import { FilterToolbar } from "@/components/ui/page";
import { getDefaultPeriod } from "@/lib/opco/period";
import {
  clampPeriodToPresent,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";

type PeriodSelectorProps = {
  year: number;
  month: number;
};

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function PeriodSelector({ year, month }: PeriodSelectorProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedMonth, setSelectedMonth] = useState(month);

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(selectedYear);
  const monthOptions = MONTHS.filter((item) => item.value <= maxMonth);

  function handleYearChange(nextYear: number) {
    setSelectedYear(nextYear);
    const capped = getMaxMonthForYear(nextYear);
    if (selectedMonth > capped) {
      setSelectedMonth(capped);
    }
  }

  function clearFilters() {
    const defaults = getDefaultPeriod();
    setSelectedYear(defaults.year);
    setSelectedMonth(defaults.month);
    const next = clampPeriodToPresent(defaults.year, defaults.month);
    router.push(`/opco?year=${next.year}&month=${next.month}`);
  }

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        const next = clampPeriodToPresent(selectedYear, selectedMonth);
        router.push(`/opco?year=${next.year}&month=${next.month}`);
      }}
    >
      <FilterToolbar className="justify-end">
        <div>
          <FieldLabel htmlFor="dashboard-month">Month</FieldLabel>
          <Select
            id="dashboard-month"
            name="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            className="w-40"
          >
            {monthOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="dashboard-year">Year</FieldLabel>
          <Select
            id="dashboard-year"
            name="year"
            value={selectedYear}
            onChange={(event) => handleYearChange(Number(event.target.value))}
            className="w-28"
          >
            {yearOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">Apply</Button>
        <Button type="button" variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      </FilterToolbar>
    </form>
  );
}
