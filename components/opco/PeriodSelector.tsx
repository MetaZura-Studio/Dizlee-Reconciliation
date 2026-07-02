"use client";

import { useRouter } from "next/navigation";

import { formatPeriodLabel } from "@/lib/opco/period";

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
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextYear = formData.get("year");
        const nextMonth = formData.get("month");
        router.push(`/opco?year=${nextYear}&month=${nextMonth}`);
      }}
    >
      <div>
        <label htmlFor="dashboard-year" className="text-sm font-medium text-zinc-700">
          Year
        </label>
        <input
          id="dashboard-year"
          name="year"
          type="number"
          min={2000}
          max={2100}
          defaultValue={year}
          className="mt-1 block w-28 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="dashboard-month" className="text-sm font-medium text-zinc-700">
          Month
        </label>
        <select
          id="dashboard-month"
          name="month"
          defaultValue={month}
          className="mt-1 block w-40 rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          {MONTHS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Apply
      </button>
      <p className="text-sm text-zinc-500">
        Viewing {formatPeriodLabel(year, month)}
      </p>
    </form>
  );
}
