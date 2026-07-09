"use client";

import { useSyncExternalStore } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import {
  AdminSidebar,
  getAdminSidebarCollapsedServerSnapshot,
  getAdminSidebarCollapsedSnapshot,
  setAdminSidebarCollapsed,
  subscribeAdminSidebarCollapsed,
} from "@/components/admin/admin-sidebar";
import type { AdminSessionUser } from "@/lib/admin/auth";

type AdminWorkspaceProps = {
  user: AdminSessionUser;
  children: React.ReactNode;
};

export function AdminWorkspace({ user, children }: AdminWorkspaceProps) {
  const collapsed = useSyncExternalStore(
    subscribeAdminSidebarCollapsed,
    getAdminSidebarCollapsedSnapshot,
    getAdminSidebarCollapsedServerSnapshot,
  );

  function handleToggleCollapsed() {
    setAdminSidebarCollapsed(!collapsed);
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AdminHeader user={user} />
      <div className="flex flex-1">
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapsed={handleToggleCollapsed}
        />
        <main className="flex-1 overflow-auto bg-canvas p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
