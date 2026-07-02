"use client";

import { useEffect, useState } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import {
  AdminSidebar,
  readAdminSidebarCollapsed,
  writeAdminSidebarCollapsed,
} from "@/components/admin/admin-sidebar";
import type { AdminSessionUser } from "@/lib/admin/auth";

type AdminWorkspaceProps = {
  user: AdminSessionUser;
  children: React.ReactNode;
};

export function AdminWorkspace({ user, children }: AdminWorkspaceProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsed(readAdminSidebarCollapsed());
    setReady(true);
  }, []);

  function handleToggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      writeAdminSidebarCollapsed(next);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader user={user} />
      <div className="flex flex-1">
        {ready ? (
          <AdminSidebar
            collapsed={collapsed}
            onToggleCollapsed={handleToggleCollapsed}
          />
        ) : (
          <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-zinc-50 lg:block" />
        )}
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
