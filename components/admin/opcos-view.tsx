"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { OpcoDeleteModal } from "@/components/admin/opco-delete-modal";
import { OpcoFormModal } from "@/components/admin/opco-form-modal";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import type { AdminEntityStatus, OpcoListItem } from "@/lib/admin/opcos.shared";
import { formatEntityStatusLabel } from "@/lib/admin/opcos.shared";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type OpcoSortField = "name" | "currency" | "status" | "users";

function entityStatusTone(status: AdminEntityStatus): "success" | "neutral" {
  return status === "ACTIVE" ? "success" : "neutral";
}

function compareOpcos(
  a: OpcoListItem,
  b: OpcoListItem,
  sortBy: OpcoSortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "currency":
      return a.defaultCurrencyIso.localeCompare(b.defaultCurrencyIso) * dir;
    case "status":
      return a.status.localeCompare(b.status) * dir;
    case "users":
      return (a.userCount - b.userCount) * dir;
    case "name":
    default:
      return a.name.localeCompare(b.name) * dir;
  }
}

type OpcosViewProps = {
  initialOpcos: OpcoListItem[];
  currencies: CurrencyListItem[];
};

export function OpcosView({ initialOpcos, currencies }: OpcosViewProps) {
  const [opcos, setOpcos] = useState(initialOpcos);
  const [sortBy, setSortBy] = useState<OpcoSortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedOpco, setSelectedOpco] = useState<OpcoListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedOpcos = useMemo(
    () => [...opcos].sort((a, b) => compareOpcos(a, b, sortBy, sortDir)),
    [opcos, sortBy, sortDir],
  );

  const applySort = (field: OpcoSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

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
    <PageCard>
      <PageHeader
        title="OpCos"
        description="Create OpCo organizations first, then assign users under them from Users."
        actions={<Button onClick={openCreate}>Create OpCo</Button>}
      />

      {successMessage ? (
        <p className={ui.alertSuccess}>{successMessage}</p>
      ) : null}
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <div className="mt-6 space-y-4">
        {sortedOpcos.length === 0 ? (
          <EmptyState
            title="No OpCos yet"
            description="Create one to assign OpCo users."
          />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <SortableDataTableTh
                    label="Name"
                    active={sortBy === "name"}
                    direction={sortDir}
                    onSort={() => applySort("name")}
                  />
                  <SortableDataTableTh
                    label="Default currency"
                    active={sortBy === "currency"}
                    direction={sortDir}
                    onSort={() => applySort("currency")}
                  />
                  <SortableDataTableTh
                    label="Status"
                    active={sortBy === "status"}
                    direction={sortDir}
                    onSort={() => applySort("status")}
                  />
                  <SortableDataTableTh
                    label="Users"
                    active={sortBy === "users"}
                    direction={sortDir}
                    onSort={() => applySort("users")}
                  />
                  <DataTableTh align="right">Actions</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {sortedOpcos.map((opco) => (
                  <DataTableRow key={opco.id}>
                    <DataTableTd className="font-medium text-foreground">
                      {opco.name}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {opco.defaultCurrencyIso}
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={entityStatusTone(opco.status)}>
                        {formatEntityStatusLabel(opco.status)}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {opco.userCount}
                    </DataTableTd>
                    <DataTableTd align="right">
                      <div className="flex justify-end gap-2">
                        <IconButton label="Edit OpCo" onClick={() => openEdit(opco)}>
                          <IconPencil />
                        </IconButton>
                        <IconButton
                          label="Delete OpCo"
                          variant="danger"
                          onClick={() => openDelete(opco)}
                        >
                          <IconTrash />
                        </IconButton>
                      </div>
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>
        )}
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
    </PageCard>
  );
}
