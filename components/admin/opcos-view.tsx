"use client";

import { useCallback, useRef, useState } from "react";

import { OpcoDeleteModal } from "@/components/admin/opco-delete-modal";
import { OpcoFormModal } from "@/components/admin/opco-form-modal";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import type { OpcoListItem } from "@/lib/admin/opcos.shared";
import { formatEntityStatusLabel } from "@/lib/admin/opcos.shared";

type OpcosViewProps = {
  initialOpcos: OpcoListItem[];
  currencies: CurrencyListItem[];
};

export function OpcosView({ initialOpcos, currencies }: OpcosViewProps) {
  const [opcos, setOpcos] = useState(initialOpcos);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedOpco, setSelectedOpco] = useState<OpcoListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setError(null);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => setSuccessMessage(null), 4000);
  }, []);

  const reload = async () => {
    const response = await fetch("/api/admin/opcos");
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "Failed to reload OpCos");
    }
    setOpcos(body.data.opcos as OpcoListItem[]);
  };

  const openCreate = () => {
    setFormMode("create");
    setSelectedOpco(null);
    setFormOpen(true);
  };

  const openEdit = (opco: OpcoListItem) => {
    setFormMode("edit");
    setSelectedOpco(opco);
    setFormOpen(true);
  };

  const openDelete = (opco: OpcoListItem) => {
    setSelectedOpco(opco);
    setDeleteOpen(true);
  };

  const handleSaved = async (_opco: OpcoListItem, message: string) => {
    try {
      await reload();
      showSuccess(message);
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Saved, but failed to refresh the list",
      );
    }
  };

  const handleDeleted = async (message: string) => {
    try {
      await reload();
      showSuccess(message);
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Deleted, but failed to refresh the list",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">OpCos</h1>
          <p className="text-sm text-foreground-muted">
            Create OpCo organizations first, then assign users under them from
            Users.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Create OpCo
        </button>
      </div>

      {successMessage ? (
        <p className="rounded-md border border-success/30 bg-success-muted px-3 py-2 text-sm text-success">
          {successMessage}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Default currency</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Users</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {opcos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-foreground-subtle"
                  >
                    No OpCos yet. Create one to assign OpCo users.
                  </td>
                </tr>
              ) : (
                opcos.map((opco) => (
                  <tr key={opco.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {opco.name}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {opco.defaultCurrencyIso}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {formatEntityStatusLabel(opco.status)}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {opco.userCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(opco)}
                          className="rounded-md border border-border-strong px-2.5 py-1 text-xs text-foreground-muted hover:bg-surface-muted"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(opco)}
                          className="rounded-md border border-danger-border px-2.5 py-1 text-xs text-danger hover:bg-danger-muted"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OpcoFormModal
        open={formOpen}
        mode={formMode}
        opco={selectedOpco}
        currencies={currencies}
        onClose={() => setFormOpen(false)}
        onSaved={(opco, message) => void handleSaved(opco, message)}
      />

      <OpcoDeleteModal
        open={deleteOpen}
        opco={selectedOpco}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(message) => void handleDeleted(message)}
      />
    </div>
  );
}
