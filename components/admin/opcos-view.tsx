"use client";

import { useMemo, useState } from "react";

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
import { ListPagination } from "@/components/ui/list-pagination";
import { PageCard, PageHeader, FilterToolbar } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import type { AdminEntityStatus, OpcoListItem } from "@/lib/admin/opcos.shared";
import { formatEntityStatusLabel } from "@/lib/admin/opcos.shared";
import { paginateItems } from "@/lib/ui/list-pagination";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type OpcoSortField = "name" | "currency" | "status" | "users";
type OpcoStatusFilter = AdminEntityStatus | "all";

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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OpcoStatusFilter>("all");
  const [currencyIso, setCurrencyIso] = useState("all");
  const [sortBy, setSortBy] = useState<OpcoSortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedOpco, setSelectedOpco] = useState<OpcoListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const currencyOptions = useMemo(() => {
    const codes = new Set(opcos.map((opco) => opco.defaultCurrencyIso));
    return [...codes].sort((a, b) => a.localeCompare(b));
  }, [opcos]);

  const filteredOpcos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return opcos
      .filter((opco) => {
        if (status !== "all" && opco.status !== status) {
          return false;
        }
        if (currencyIso !== "all" && opco.defaultCurrencyIso !== currencyIso) {
          return false;
        }
        if (!query) {
          return true;
        }
        return (
          opco.name.toLowerCase().includes(query) ||
          opco.defaultCurrencyIso.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => compareOpcos(a, b, sortBy, sortDir));
  }, [opcos, search, status, currencyIso, sortBy, sortDir]);

  const pagedOpcos = useMemo(
    () => paginateItems(filteredOpcos, page),
    [filteredOpcos, page],
  );

  const applySort = (field: OpcoSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

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
      setError(null);
      toast.success(message);
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
      setError(null);
      toast.success(message);
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

      {error ? <p className={ui.alertError}>{error}</p> : null}

      <FilterToolbar className="mt-6">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm lg:col-span-2">
            <span className={ui.label}>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Name or currency"
              className={ui.input}
            />
          </label>
          <label className="text-sm">
            <span className={ui.label}>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as OpcoStatusFilter);
                setPage(1);
              }}
              className={ui.select}
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Currency</span>
            <select
              value={currencyIso}
              onChange={(event) => {
                setCurrencyIso(event.target.value);
                setPage(1);
              }}
              className={ui.select}
            >
              <option value="all">All currencies</option>
              {currencyOptions.map((iso) => (
                <option key={iso} value={iso}>
                  {iso}
                </option>
              ))}
            </select>
          </label>
        </div>
      </FilterToolbar>

      <div className="mt-6 space-y-4">
        {filteredOpcos.length === 0 ? (
          <EmptyState
            title={opcos.length === 0 ? "No OpCos yet" : "No OpCos found"}
            description={
              opcos.length === 0
                ? "Create one to assign OpCo users."
                : "No OpCos match your filters."
            }
          />
        ) : (
          <>
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
                  {pagedOpcos.items.map((opco) => (
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
            <ListPagination
              total={pagedOpcos.total}
              page={pagedOpcos.page}
              totalPages={pagedOpcos.totalPages}
              noun="OpCo"
              nounPlural="OpCos"
              onPageChange={setPage}
            />
          </>
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
