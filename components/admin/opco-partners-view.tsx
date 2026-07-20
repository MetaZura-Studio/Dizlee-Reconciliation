"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { FilterToolbar, PageCard } from "@/components/ui/page";
import type {
  OpcoListItem,
  OpcoPartnerLinksPageData,
  OpcoPartnerLinksView,
} from "@/lib/admin/opco-partner-links.shared";
import { paginateItems } from "@/lib/ui/list-pagination";
import { ui } from "@/lib/ui/classes";

type LinkStatusFilter = "all" | "linked" | "unlinked";

type OpcoPartnersViewProps = {
  initialData: OpcoPartnerLinksPageData;
};

export function OpcoPartnersView({ initialData }: OpcoPartnersViewProps) {
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
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/opco-partners?opcoId=${encodeURIComponent(opcoId)}`,
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load partner links");
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

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOpcoId) {
      return;
    }

    setError(null);
    setSuccess(null);
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
        throw new Error(body.error ?? "Failed to save partner links");
      }

      applyLinksView(body.data as OpcoPartnerLinksView);
      setSuccess((body.message as string) ?? "Partner links saved.");
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

  const pagedPartners = useMemo(
    () => paginateItems(filteredPartners, page, 24),
    [filteredPartners, page],
  );

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
    <PageCard>
      {error ? <p className={ui.alertError}>{error}</p> : null}
      {success ? <p className={ui.alertSuccess}>{success}</p> : null}

      <p className={`mt-4 ${ui.cardPadding} text-sm text-foreground-muted`}>
        Linked partners control upload dropdowns, monitoring pairs, consolidation
        readiness, and report validation. Unlinked OpCo–Partner uploads are
        rejected.
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
        </FilterToolbar>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-foreground">Partners</h2>
            <p className="text-sm text-foreground-subtle">
              {loading
                ? "Loading…"
                : `${linkedCount} of ${totalPartners} partners linked`}
            </p>
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
                    <span className="text-sm text-foreground">{partner.name}</span>
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

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={loading || saving || !selectedOpcoId}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void reload()}
            disabled={loading || saving || !selectedOpcoId}
          >
            {loading ? "Reloading…" : "Reload"}
          </Button>
        </div>
      </form>
    </PageCard>
  );
}
