"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { FilterToolbar } from "@/components/ui/page";
import { formatPeriodLabel } from "@/lib/opco/period";
import { ui } from "@/lib/ui/classes";

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

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextYear = formData.get("year");
        const nextMonth = formData.get("month");
        router.push(`/opco?year=${nextYear}&month=${nextMonth}`);
      }}
    >
      <FilterToolbar>
        <div>
          <FieldLabel htmlFor="dashboard-year">Year</FieldLabel>
          <Input
            id="dashboard-year"
            name="year"
            type="number"
            min={2000}
            max={2100}
            defaultValue={year}
            className="w-28"
          />
        </div>
        <div>
          <FieldLabel htmlFor="dashboard-month">Month</FieldLabel>
          <Select
            id="dashboard-month"
            name="month"
            defaultValue={month}
            className="w-40"
          >
            {MONTHS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">Apply</Button>
        <p className={ui.hint}>Viewing {formatPeriodLabel(year, month)}</p>
      </FilterToolbar>
    </form>
  );
}
