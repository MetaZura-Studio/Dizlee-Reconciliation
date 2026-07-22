"use client";

import { useMemo, useState } from "react";

import { PartnerDeleteModal } from "@/components/admin/partner-delete-modal";
import { PartnerFormModal } from "@/components/admin/partner-form-modal";
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
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { ListPagination } from "@/components/ui/list-pagination";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import type { AdminEntityStatus, PartnerListItem } from "@/lib/admin/partners.shared";
import { formatEntityStatusLabel } from "@/lib/admin/partners.shared";
import { paginateItems } from "@/lib/ui/list-pagination";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type PartnerSortField = "name" | "status" | "users";
type PartnerStatusFilter = AdminEntityStatus | "all";

function entityStatusTone(status: AdminEntityStatus): "success" | "neutral" {
  return status === "ACTIVE" ? "success" : "neutral";
}

function comparePartners(
  a: PartnerListItem,
  b: PartnerListItem,
  sortBy: PartnerSortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "status":
      return a.status.localeCompare(b.status) * dir;
    case "users":
      return (a.userCount - b.userCount) * dir;
    case "name":
    default:
      return a.name.localeCompare(b.name) * dir;
  }
}

type PartnersViewProps = {
  initialPartners: PartnerListItem[];
};

export function PartnersView({ initialPartners }: PartnersViewProps) {
  const [partners, setPartners] = useState(initialPartners);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PartnerStatusFilter>("all");
  const [sortBy, setSortBy] = useState<PartnerSortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedPartner, setSelectedPartner] = useState<PartnerListItem | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase();
    return partners
      .filter((partner) => {
        if (status !== "all" && partner.status !== status) {
          return false;
        }
        if (!query) {
          return true;
        }
        return partner.name.toLowerCase().includes(query);
      })
      .sort((a, b) => comparePartners(a, b, sortBy, sortDir));
  }, [partners, search, status, sortBy, sortDir]);

  const pagedPartners = useMemo(
    () => paginateItems(filteredPartners, page),
    [filteredPartners, page],
  );

  const applySort = (field: PartnerSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

  const reload = async () => {
    const response = await fetch("/api/admin/partners");
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "Failed to reload Partners");
    }
    setPartners(body.data.partners as PartnerListItem[]);
  };

  const openCreate = () => {
    setFormMode("create");
    setSelectedPartner(null);
    setFormOpen(true);
  };

  const openEdit = (partner: PartnerListItem) => {
    setFormMode("edit");
    setSelectedPartner(partner);
    setFormOpen(true);
  };

  const openDelete = (partner: PartnerListItem) => {
    setSelectedPartner(partner);
    setDeleteOpen(true);
  };

  const handleSaved = async (_partner: PartnerListItem, message: string) => {
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
        title="Partners"
        description="Create Partner organizations first, then assign users under them from Users."
        actions={<Button onClick={openCreate}>Create Partner</Button>}
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
              placeholder="Partner name"
              className={ui.input}
            />
          </label>
          <label className="text-sm">
            <span className={ui.label}>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as PartnerStatusFilter);
                setPage(1);
              }}
              className={ui.select}
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </div>
      </FilterToolbar>

      <div className="mt-6 space-y-4">
        {filteredPartners.length === 0 ? (
          <EmptyState
            title={partners.length === 0 ? "No Partners yet" : "No Partners found"}
            description={
              partners.length === 0
                ? "Create one to assign Partner users."
                : "No Partners match your filters."
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
                  {pagedPartners.items.map((partner) => (
                    <DataTableRow key={partner.id}>
                      <DataTableTd className="font-medium text-foreground">
                        {partner.name}
                      </DataTableTd>
                      <DataTableTd>
                        <StatusPill tone={entityStatusTone(partner.status)}>
                          {formatEntityStatusLabel(partner.status)}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {partner.userCount}
                      </DataTableTd>
                      <DataTableTd align="right">
                        <div className="flex justify-end gap-2">
                          <IconButton
                            label="Edit Partner"
                            onClick={() => openEdit(partner)}
                          >
                            <IconPencil />
                          </IconButton>
                          <IconButton
                            label="Delete Partner"
                            variant="danger"
                            onClick={() => openDelete(partner)}
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
              total={pagedPartners.total}
              page={pagedPartners.page}
              totalPages={pagedPartners.totalPages}
              noun="Partner"
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <PartnerFormModal
        open={formOpen}
        mode={formMode}
        partner={selectedPartner}
        onClose={() => setFormOpen(false)}
        onSaved={(partner, message) => void handleSaved(partner, message)}
      />

      <PartnerDeleteModal
        open={deleteOpen}
        partner={selectedPartner}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(message) => void handleDeleted(message)}
      />
    </PageCard>
  );
}
