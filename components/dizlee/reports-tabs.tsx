"use client";

type ReportsTabsProps = {
  active: "reports" | "reupload" | "monitoring";
};

const TABS: Array<{
  id: ReportsTabsProps["active"];
  label: string;
  disabled?: boolean;
}> = [
  { id: "reports", label: "Reports" },
  { id: "reupload", label: "Reupload requests", disabled: true },
  { id: "monitoring", label: "Reports monitoring", disabled: true },
];

export function ReportsTabs({ active }: ReportsTabsProps) {
  return (
    <div className="border-b border-zinc-200">
      <nav className="-mb-px flex gap-6">
        {TABS.map((tab) => {
          const isActive = tab.id === active;

          return (
            <span
              key={tab.id}
              className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                isActive
                  ? "border-zinc-900 text-zinc-900"
                  : tab.disabled
                    ? "cursor-not-allowed border-transparent text-zinc-400"
                    : "border-transparent text-zinc-500"
              }`}
              title={tab.disabled ? "Coming in a later feature" : undefined}
            >
              {tab.label}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
