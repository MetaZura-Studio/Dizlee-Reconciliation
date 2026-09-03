/**
 * Admin home dashboard summarizing organizations, users, and recent audit activity.
 * Entry point after sign-in for high-level platform health.
 */

import type { ReactNode } from "react";
import Link from "next/link";

import { DashboardRecentActivity } from "@/components/admin/dashboard-recent-activity";
import { PageCard, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import type { AdminDashboardData } from "@/lib/admin/dashboard";
import { cn } from "@/lib/ui/classes";

type DashboardViewProps = {
  data: AdminDashboardData;
};

function activeHint(active: number, total: number): string {
  return `${active} active of ${total}`;
}

function DashboardSection({
  title,
  description,
  action,
  children,
  tone = "blue",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: "blue" | "purple" | "teal";
}) {
  const accent: Record<typeof tone, string> = {
    blue: "border-primary/25 bg-gradient-to-br from-[#f5f7ff] to-white",
    purple: "border-[#e8e0ff] bg-gradient-to-br from-[#f8f5ff] to-white",
    teal: "border-success-border bg-gradient-to-br from-[#f2fbf9] to-white",
  };

  const bar: Record<typeof tone, string> = {
    blue: "bg-primary",
    purple: "bg-[#8b5cf6]",
    teal: "bg-success",
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-5 shadow-[var(--shadow-sm)] sm:p-6",
        accent[tone],
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1.5", bar[tone])} aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-sm text-foreground-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pl-2">{action}</div> : null}
      </div>
      <div className="mt-5 pl-2">{children}</div>
    </section>
  );
}

export function DashboardView({ data }: DashboardViewProps) {
  const { opcos, partners, users, usersByRole, opcoPartnerLinks, currencies, recentActivity } =
    data;

  return (
    <PageCard>
      <PageHeader
        title="Dashboard"
        description="Platform overview — organizations, users, and recent admin activity."
      />

      <div className="space-y-8">
        <DashboardSection
          title="Organizations"
          description="OpCos, partners, and how they are linked on the platform."
          tone="blue"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="OpCos"
              value={opcos.total}
              hint={activeHint(opcos.active, opcos.total)}
              tone="blue"
              href="/admin/opcos"
            />
            <StatCard
              label="Partners"
              value={partners.total}
              hint={activeHint(partners.active, partners.total)}
              tone="purple"
              href="/admin/partners"
            />
            <StatCard
              label="OpCo–Partner links"
              value={opcoPartnerLinks}
              hint="Configured relationships"
              tone="teal"
              href="/admin/opco-partners"
            />
            <StatCard
              label="Currencies"
              value={currencies}
              hint="Available for rates & billing"
              tone="amber"
              href="/admin/currencies"
            />
          </div>
        </DashboardSection>

        <DashboardSection
          title="Users"
          description="Accounts across all portals and roles."
          tone="purple"
          action={
            <Link
              href="/admin/users"
              className="text-sm font-medium text-foreground-muted hover:text-foreground"
            >
              Manage users
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total users"
              value={users.total}
              hint={activeHint(users.active, users.total)}
              tone="blue"
              href="/admin/users"
            />
            <StatCard
              label="Admin users"
              value={usersByRole.admin}
              tone="purple"
            />
            <StatCard
              label="Dizlee users"
              value={usersByRole.client}
              tone="teal"
              href="/admin/users?role=client"
            />
            <StatCard
              label="OpCo & Partner users"
              value={usersByRole.opco + usersByRole.partner}
              hint={`${usersByRole.opco} OpCo · ${usersByRole.partner} Partner`}
              tone="amber"
              href="/admin/users?role=opco"
            />
          </div>
        </DashboardSection>

        <DashboardSection
          title="Recent activity"
          description="Latest audit events across the platform."
          tone="teal"
          action={
            <Link
              href="/admin/audit-logs"
              className="text-sm font-medium text-foreground-muted hover:text-foreground"
            >
              View all audit logs
            </Link>
          }
        >
          <DashboardRecentActivity items={recentActivity} />
        </DashboardSection>
      </div>
    </PageCard>
  );
}
