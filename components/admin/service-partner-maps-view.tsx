"use client";

import { useMemo, useRef, useState } from "react";

import { ServicePartnerMapDeleteModal } from "@/components/admin/service-partner-map-delete-modal";
import { ServicePartnerMapFormModal } from "@/components/admin/service-partner-map-form-modal";
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
import { useToast } from "@/components/ui/toast";
import type { OpcoListItem } from "@/lib/admin/opcos.shared";
import type { PartnerListItem } from "@/lib/admin/partners.shared";
import type { ServicePartnerMapListItem } from "@/lib/admin/service-partner-maps.shared";
import { formatAppError } from "@/lib/errors/format";
import { paginateItems } from "@/lib/ui/list-pagination";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type SortField = "opcoName" | "serviceName" | "partnerName";

type ServicePartnerMapsViewProps = {
  initialMaps: ServicePartnerMapListItem[];
  partners: PartnerListItem[];
  opcos: OpcoListItem[];
};

function compareMaps(
  a: ServicePartnerMapListItem,
  b: ServicePartnerMapListItem,
  sortBy: SortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  if (sortBy === "partnerName") {
    return a.partnerName.localeCompare(b.partnerName) * dir;
  }
  if (sortBy === "opcoName") {
    return a.opcoName.localeCompare(b.opcoName) * dir;
  }
  return a.serviceName.localeCompare(b.serviceName) * dir;
}

export function ServicePartnerMapsView({
  initialMaps,
  partners,
  opcos,
}: ServicePartnerMapsViewProps) {
  const [maps, setMaps] = useState(initialMaps);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("serviceName");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<ServicePartnerMapListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return maps
      .filter((row) => {
        if (!query) {
          return true;
        }
        return (
          row.opcoName.toLowerCase().includes(query) ||
          row.serviceName.toLowerCase().includes(query) ||
          row.partnerName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => compareMaps(a, b, sortBy, sortDir));
  }, [maps, search, sortBy, sortDir]);

  const paged = useMemo(() => paginateItems(filtered, page), [filtered, page]);

  const applySort = (field: SortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

  const reload = async () => {
    const response = await fetch("/api/admin/service-partner-maps");
    const body = await response.json();
    if (!response.ok) {
      throw new Error(formatAppError(body, "Failed to reload mappings"));
    }
    setMaps(body.data.maps as ServicePartnerMapListItem[]);
  };

  const handleSaved = async (_map: ServicePartnerMapListItem, message: string) => {
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

  const handleImport = async (file: File) => {
    setImportBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/service-partner-maps/import", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Import failed"));
      }
      const data = body.data as {
        created: number;
        updated: number;
        issues: Array<{ rowNumber: number; message: string }>;
      };
      await reload();
      const issueNote =
        data.issues.length > 0
          ? ` ${data.issues.length} row issue(s).`
          : "";
      toast.success(
        `Import complete: ${data.created} created, ${data.updated} updated.${issueNote}`,
      );
      if (data.issues.length > 0) {
        setError(
          data.issues
            .slice(0, 5)
            .map((issue) => `Row ${issue.rowNumber}: ${issue.message}`)
            .join(" · "),
        );
      }
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "Import failed",
      );
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <PageCard>
      <PageHeader
        title="Service–Partner maps"
        description="Per-OpCo Service/Application name → Partner. Used when OpCo reports have no Partner column."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                window.location.href = "/api/admin/service-partner-maps/template";
              }}
            >
              Download template
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={importBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              {importBusy ? "Importing…" : "Upload Excel"}
            </Button>
            <Button
              onClick={() => {
                setFormMode("create");
                setSelected(null);
                setFormOpen(true);
              }}
            >
              Create mapping
            </Button>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImport(file);
          }
        }}
      />

      {error ? <p className={`mt-4 ${ui.alertError}`}>{error}</p> : null}

      <FilterToolbar className="mt-6">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm lg:col-span-2">
            <span className={ui.label}>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="OpCo, Service, or Partner name"
              className={ui.input}
            />
          </label>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setSearch("");
            setSortBy("serviceName");
            setSortDir("asc");
            setPage(1);
          }}
        >
          Clear filters
        </Button>
      </FilterToolbar>

      <div className="mt-6 space-y-4">
        {filtered.length === 0 ? (
          <EmptyState
            title={maps.length === 0 ? "No mappings yet" : "No mappings found"}
            description={
              maps.length === 0
                ? "Create a row or upload an Excel list of OpCo, Partner, and Service."
                : "No mappings match your search."
            }
          />
        ) : (
          <>
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <SortableDataTableTh
                      label="OpCo"
                      active={sortBy === "opcoName"}
                      direction={sortDir}
                      onSort={() => applySort("opcoName")}
                    />
                    <SortableDataTableTh
                      label="Service / Application"
                      active={sortBy === "serviceName"}
                      direction={sortDir}
                      onSort={() => applySort("serviceName")}
                    />
                    <SortableDataTableTh
                      label="Partner"
                      active={sortBy === "partnerName"}
                      direction={sortDir}
                      onSort={() => applySort("partnerName")}
                    />
                    <DataTableTh align="center">Actions</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {paged.items.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableTd className="text-foreground-muted">
                        {row.opcoName}
                      </DataTableTd>
                      <DataTableTd className="font-medium text-foreground">
                        {row.serviceName}
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {row.partnerName}
                      </DataTableTd>
                      <DataTableTd align="center">
                        <div className="flex justify-center gap-2">
                          <IconButton
                            label="Edit mapping"
                            onClick={() => {
                              setFormMode("edit");
                              setSelected(row);
                              setFormOpen(true);
                            }}
                          >
                            <IconPencil />
                          </IconButton>
                          <IconButton
                            label="Delete mapping"
                            variant="danger"
                            onClick={() => {
                              setSelected(row);
                              setDeleteOpen(true);
                            }}
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
              total={paged.total}
              page={paged.page}
              totalPages={paged.totalPages}
              noun="mapping"
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ServicePartnerMapFormModal
        open={formOpen}
        mode={formMode}
        map={selected}
        partners={partners}
        opcos={opcos}
        onClose={() => setFormOpen(false)}
        onSaved={(map, message) => void handleSaved(map, message)}
      />

      <ServicePartnerMapDeleteModal
        open={deleteOpen}
        map={selected}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(message) => void handleDeleted(message)}
      />
    </PageCard>
  );
}
