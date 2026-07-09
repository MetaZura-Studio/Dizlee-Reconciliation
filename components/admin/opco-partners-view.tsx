"use client";

import { useCallback, useState } from "react";

import type {
  OpcoListItem,
  OpcoPartnerLinksPageData,
  OpcoPartnerLinksView,
} from "@/lib/admin/opco-partner-links.shared";

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

  if (opcos.length === 0) {
    return (
      <p className="rounded-md border border-warning-border bg-warning-muted px-3 py-2 text-sm text-warning">
        No OpCos are available. Add OpCo master data before configuring partner
        links.
      </p>
    );
  }

  const linkedCount = selectedPartnerIds.size;
  const totalPartners = linksView?.totalPartners ?? linksView?.partners.length ?? 0;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-success-border bg-success-muted px-3 py-2 text-sm text-success">
          {success}
        </p>
      ) : null}

      <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground-muted">
        Linked partners control upload dropdowns, monitoring lanes, consolidation
        readiness, and report validation. Unlinked OpCo–Partner uploads are
        rejected.
      </p>

      <form onSubmit={(event) => void save(event)} className="space-y-6">
        <div className="space-y-1">
          <label htmlFor="opcoId" className="text-sm font-medium text-foreground-muted">
            OpCo
          </label>
          <select
            id="opcoId"
            value={selectedOpcoId}
            onChange={(event) => handleOpcoChange(event.target.value)}
            disabled={loading || saving}
            className="w-full max-w-md rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
          >
            {opcos.map((opco: OpcoListItem) => (
              <option key={opco.id} value={opco.id}>
                {opco.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-foreground">Partners</h2>
            <p className="text-sm text-foreground-subtle">
              {loading
                ? "Loading…"
                : `${linkedCount} of ${totalPartners} partners linked`}
            </p>
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {(linksView?.partners ?? []).map((partner) => (
              <label
                key={partner.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-muted"
              >
                <input
                  type="checkbox"
                  checked={selectedPartnerIds.has(partner.id)}
                  onChange={() => togglePartner(partner.id)}
                  disabled={loading || saving}
                  className="h-4 w-4 rounded border-border-strong"
                />
                <span className="text-sm text-foreground">{partner.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || saving || !selectedOpcoId}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading || saving || !selectedOpcoId}
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
          >
            {loading ? "Reloading…" : "Reload"}
          </button>
        </div>
      </form>
    </div>
  );
}
