/**
 * Configure which partners are associated with each OpCo.
 * Links tab: checkbox matrix. Requests tab: Accept / Reject OpCo link asks.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { FieldLegend } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingOverlay } from "@/components/ui/loading";
import { ListPagination } from "@/components/ui/list-pagination";
import { FilterToolbar, PageCard } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import type {
  OpcoListItem,
  OpcoPartnerLinksPageData,
  OpcoPartnerLinksView,
} from "@/lib/admin/opco-partner-links.shared";
import type { AdminPartnerLinkRequestItem } from "@/lib/admin/opco-partner-link-requests";
import { paginateItems } from "@/lib/ui/list-pagination";
import { cn, ui } from "@/lib/ui/classes";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { formatAppError } from "@/lib/errors/format";

type LinkStatusFilter = "all" | "linked" | "unlinked";
type PageTab = "links" | "requests";

type OpcoPartnersViewProps = {
  initialData: OpcoPartnerLinksPageData;
  initialTab?: PageTab;
  initialPendingRequestCount?: number;
  initialRequests?: AdminPartnerLinkRequestItem[];
};

export function OpcoPartnersView({
  initialData,
  initialTab = "links",
  initialPendingRequestCount = 0,
  initialRequests = [],
}: OpcoPartnersViewProps) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<PageTab>(
    initialTab === "requests" ? "requests" : "links",
  );
  const [opcos] = useState(initialData.opcos);
  const [selectedOpcoId, setSelectedOpcoId] = useState(
    initialData.links?.opco.id ?? initialData.opcos[0]?.id ?? "",
  );
  const [linksView, setLinksView] = useState<OpcoPartnerLinksView | null>(
    initialData.links,
  );
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(
    () =>
      new Set(
        initialData.links?.partners
          .filter((partner) => partner.linked)
          .map((partner) => partner.id) ?? [],
      ),
  );
  const [search, setSearch] = useState("");
  const [linkStatus, setLinkStatus] = useState<LinkStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [requests, setRequests] = useState<AdminPartnerLinkRequestItem[]>(
    initialRequests,
  );
  const [pendingRequestCount, setPendingRequestCount] = useState(
    initialPendingRequestCount,
  );
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [missingWarning, setMissingWarning] = useState<string | null>(null);

  const focusOpcoId = searchParams.get("opcoId");

  const syncTabToUrl = useCallback(
    (nextTab: PageTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "requests") {
        params.set("tab", "requests");
      } else {
        params.delete("tab");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const loadRequests = useCallback(async () => {
    setRequestsError(null);
    setRequestsLoading(true);
    try {
      const response = await fetch(
        "/api/admin/opco-partner-link-requests?status=PENDING",
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          formatAppError(body, "Failed to load partner link requests"),
        );
      }
      const next = (body.data as AdminPartnerLinkRequestItem[]) ?? [];
      setRequests(next);
      setPendingRequestCount(next.length);
    } catch (loadError) {
      setRequestsError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load partner link requests",
      );
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const selectTab = (nextTab: PageTab) => {
    setTab(nextTab);
    setError(null);
    setMissingWarning(null);
    syncTabToUrl(nextTab);
    if (nextTab === "requests") {
      void loadRequests();
    }
  };

  const applyLinksView = useCallback((view: OpcoPartnerLinksView) => {
    setLinksView(view);
    setSelectedPartnerIds(
      new Set(
        view.partners.filter((partner) => partner.linked).map((partner) => partner.id),
      ),
    );
  }, []);

  const loadOpcoLinks = async (opcoId: string) => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/opco-partners?opcoId=${encodeURIComponent(opcoId)}`,
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to load partner links"));
      }
      applyLinksView(body.data as OpcoPartnerLinksView);
      setSelectedOpcoId(opcoId);
      setPage(1);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load partner links",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpcoChange = (opcoId: string) => {
    if (opcoId === selectedOpcoId) {
      return;
    }
    void loadOpcoLinks(opcoId);
  };

  const reload = async () => {
    if (!selectedOpcoId) {
      return;
    }
    await loadOpcoLinks(selectedOpcoId);
  };

  const togglePartner = (partnerId: string) => {
    setSelectedPartnerIds((current) => {
      const next = new Set(current);
      if (next.has(partnerId)) {
        next.delete(partnerId);
      } else {
        next.add(partnerId);
      }
      return next;
    });
  };

  const selectAllPartners = () => {
    const partners = linksView?.partners ?? [];
    setSelectedPartnerIds(new Set(partners.map((partner) => partner.id)));
  };

  const unselectAllPartners = () => {
    setSelectedPartnerIds(new Set());
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOpcoId) {
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/admin/opco-partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opcoId: selectedOpcoId,
          partnerIds: [...selectedPartnerIds],
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to save partner links"));
      }

      applyLinksView(body.data as OpcoPartnerLinksView);
      toast.success((body.message as string) ?? "Partner links saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save partner links",
      );
    } finally {
      setSaving(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    setActionId(requestId);
    setMissingWarning(null);
    setRequestsError(null);
    try {
      const response = await fetch(
        `/api/admin/opco-partner-link-requests/${encodeURIComponent(requestId)}/accept`,
        { method: "POST" },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to accept request"));
      }

      const missing = (body.missingPartnerNames as string[] | undefined) ?? [];
      if (missing.length > 0) {
        setMissingWarning(
          `Missing partners (create in Partners, then Accept again): ${missing.join(", ")}`,
        );
        toast.success(
          (body.message as string) ??
            "Some partners linked; create the missing ones manually.",
        );
      } else {
        toast.success(
          (body.message as string) ?? "Partner links created. OpCo notified.",
        );
      }
      await loadRequests();
    } catch (actionError) {
      setRequestsError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to accept request",
      );
    } finally {
      setActionId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    setActionId(requestId);
    setMissingWarning(null);
    setRequestsError(null);
    try {
      const response = await fetch(
        `/api/admin/opco-partner-link-requests/${encodeURIComponent(requestId)}/reject`,
        { method: "POST" },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to reject request"));
      }
      toast.success(
        (body.message as string) ??
          "Partner link request denied. OpCo notified.",
      );
      await loadRequests();
    } catch (actionError) {
      setRequestsError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to reject request",
      );
    } finally {
      setActionId(null);
    }
  };

  const filteredPartners = useMemo(() => {
    const partners = linksView?.partners ?? [];
    const query = search.trim().toLowerCase();
    return partners.filter((partner) => {
      const linked = selectedPartnerIds.has(partner.id);
      if (linkStatus === "linked" && !linked) {
        return false;
      }
      if (linkStatus === "unlinked" && linked) {
        return false;
      }
      if (!query) {
        return true;
      }
      return partner.name.toLowerCase().includes(query);
    });
  }, [linksView?.partners, search, linkStatus, selectedPartnerIds]);

  const clearFilters = () => {
    setSearch("");
    setLinkStatus("all");
    setPage(1);
  };

  const pagedPartners = useMemo(
    () => paginateItems(filteredPartners, page, 24),
    [filteredPartners, page],
  );

  const savedLinkedIds = useMemo(
    () =>
      new Set(
        linksView?.partners.filter((partner) => partner.linked).map((partner) => partner.id) ??
          [],
      ),
    [linksView?.partners],
  );
  const hasUnsavedChanges = useMemo(() => {
    if (selectedPartnerIds.size !== savedLinkedIds.size) {
      return true;
    }
    for (const id of selectedPartnerIds) {
      if (!savedLinkedIds.has(id)) {
        return true;
      }
    }
    return false;
  }, [selectedPartnerIds, savedLinkedIds]);

  const visibleRequests = useMemo(() => {
    if (!focusOpcoId) {
      return requests;
    }
    const focused = requests.filter((row) => row.opcoId === focusOpcoId);
    return focused.length > 0 ? focused : requests;
  }, [requests, focusOpcoId]);

  if (opcos.length === 0) {
    return (
      <p className={ui.alertWarning}>
        No OpCos are available. Add OpCo master data before configuring partner
        links.
      </p>
    );
  }

  const linkedCount = selectedPartnerIds.size;
  const totalPartners = linksView?.totalPartners ?? linksView?.partners.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex rounded-2xl border border-border bg-surface-muted/50 p-1">
        {(
          [
            ["links", "Links"],
            ["requests", "Requests"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {label}
            {id === "requests" && pendingRequestCount > 0 ? (
              <span
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                aria-label={`${pendingRequestCount} pending request${pendingRequestCount === 1 ? "" : "s"}`}
              >
                {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "requests" ? (
        <PageCard>
          {requestsError ? <p className={ui.alertError}>{requestsError}</p> : null}
          {missingWarning ? (
            <p className={ui.alertWarning}>{missingWarning}</p>
          ) : null}

          <p className={`mt-4 ${ui.cardPadding} text-sm text-foreground-muted`}>
            Pending OpCo requests to link partners named in their Excel files.
            Accept matches existing Partners by name; create missing Partners
            manually if Accept reports them.
          </p>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadRequests()}
              disabled={requestsLoading || actionId !== null}
            >
              {requestsLoading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          <LoadingOverlay active={requestsLoading} className="mt-4 min-h-[12rem]">
            {visibleRequests.length === 0 ? (
              <EmptyState
                title="No pending requests"
                description="When an OpCo asks to link partners, the request appears here."
              />
            ) : (
              <DataTableFrame>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>OpCo</DataTableTh>
                      <DataTableTh align="center">Period</DataTableTh>
                      <DataTableTh>Partners</DataTableTh>
                      <DataTableTh>Message</DataTableTh>
                      <DataTableTh align="center">Requested at</DataTableTh>
                      <DataTableTh>Actions</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {visibleRequests.map((row) => (
                      <DataTableRow key={row.id}>
                        <DataTableTd>{row.opcoName}</DataTableTd>
                        <DataTableTd align="center">{row.periodLabel}</DataTableTd>
                        <DataTableTd>
                          {row.partnerNames.length
                            ? row.partnerNames.join(", ")
                            : "—"}
                        </DataTableTd>
                        <DataTableTd>
                          <span className="line-clamp-3 whitespace-pre-wrap">
                            {row.message || "—"}
                          </span>
                        </DataTableTd>
                        <DataTableTd align="center">
                          {formatAppDateTime(row.createdAt)}
                        </DataTableTd>
                        <DataTableTd>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              disabled={actionId !== null}
                              onClick={() => void acceptRequest(row.id)}
                            >
                              {actionId === row.id ? "Working…" : "Accept"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={actionId !== null}
                              onClick={() => void rejectRequest(row.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </DataTableTd>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableFrame>
            )}
          </LoadingOverlay>
        </PageCard>
      ) : (
        <PageCard>
          {error ? <p className={ui.alertError}>{error}</p> : null}

          <p className={`mt-4 ${ui.cardPadding} text-sm text-foreground-muted`}>
            Linked partners control upload dropdowns, monitoring pairs, and report
            validation. OpCo Excel files that name unlinked or unknown partners are
            blocked until you add the link.
          </p>

          <form onSubmit={(event) => void save(event)} className="mt-6 space-y-6">
            <FilterToolbar>
              <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm">
                  <FieldLegend required>OpCo</FieldLegend>
                  <select
                    id="opcoId"
                    value={selectedOpcoId}
                    onChange={(event) => handleOpcoChange(event.target.value)}
                    disabled={loading || saving}
                    className={`${ui.select} disabled:opacity-60`}
                  >
                    {opcos.map((opco: OpcoListItem) => (
                      <option key={opco.id} value={opco.id}>
                        {opco.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                    disabled={loading || saving}
                  />
                </label>
                <label className="text-sm">
                  <span className={ui.label}>Link status</span>
                  <select
                    value={linkStatus}
                    onChange={(event) => {
                      setLinkStatus(event.target.value as LinkStatusFilter);
                      setPage(1);
                    }}
                    className={ui.select}
                    disabled={loading || saving}
                  >
                    <option value="all">All partners</option>
                    <option value="linked">Linked</option>
                    <option value="unlinked">Unlinked</option>
                  </select>
                </label>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
                disabled={loading || saving}
              >
                Clear filters
              </Button>
            </FilterToolbar>

            <LoadingOverlay active={loading} className="min-h-[12rem]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    Partners
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-foreground-subtle">
                      {`${linkedCount} of ${totalPartners} partners linked`}
                      {hasUnsavedChanges ? (
                        <span className="ml-2 font-medium text-warning">
                          · Unsaved changes — click Save
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={selectAllPartners}
                        disabled={
                          loading ||
                          saving ||
                          !linksView?.partners.length ||
                          linkedCount === totalPartners
                        }
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={unselectAllPartners}
                        disabled={loading || saving || linkedCount === 0}
                      >
                        Unselect all
                      </Button>
                    </div>
                  </div>
                </div>

                {filteredPartners.length === 0 ? (
                  <EmptyState
                    title="No partners found"
                    description="No partners match your search or link status filter."
                  />
                ) : (
                  <>
                    <div
                      className={`grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 ${ui.cardPadding}`}
                    >
                      {pagedPartners.items.map((partner) => (
                        <label
                          key={partner.id}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-surface-muted"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPartnerIds.has(partner.id)}
                            onChange={() => togglePartner(partner.id)}
                            disabled={loading || saving}
                            className="h-4 w-4 shrink-0 rounded border-border-strong"
                          />
                          <span className="text-sm text-foreground">
                            {partner.name}
                          </span>
                        </label>
                      ))}
                    </div>
                    <ListPagination
                      total={pagedPartners.total}
                      page={pagedPartners.page}
                      totalPages={pagedPartners.totalPages}
                      noun="partner"
                      nounPlural="partners"
                      onPageChange={setPage}
                    />
                  </>
                )}
              </div>
            </LoadingOverlay>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={loading || saving || !selectedOpcoId}
              >
                {saving ? "Saving…" : hasUnsavedChanges ? "Save changes" : "Save"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void reload()}
                disabled={loading || saving || !selectedOpcoId}
              >
                {loading ? "Reloading…" : "Reload"}
              </Button>
              {hasUnsavedChanges ? (
                <p className="text-sm text-warning">
                  Checkbox changes are not applied until you save.
                </p>
              ) : null}
            </div>
          </form>
        </PageCard>
      )}
    </div>
  );
}
