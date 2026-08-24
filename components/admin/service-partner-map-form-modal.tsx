"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type { OpcoListItem } from "@/lib/admin/opcos.shared";
import type { PartnerListItem } from "@/lib/admin/partners.shared";
import type { ServicePartnerMapListItem } from "@/lib/admin/service-partner-maps.shared";
import { formatAppError } from "@/lib/errors/format";
import { ui } from "@/lib/ui/classes";

type FormValues = {
  opcoId: string;
  serviceName: string;
  partnerId: string;
};

type ServicePartnerMapFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  map: ServicePartnerMapListItem | null;
  partners: PartnerListItem[];
  opcos: OpcoListItem[];
  onClose: () => void;
  onSaved: (map: ServicePartnerMapListItem, message: string) => void;
};

function getInitialValues(
  mode: "create" | "edit",
  map: ServicePartnerMapListItem | null,
  partners: PartnerListItem[],
  opcos: OpcoListItem[],
): FormValues {
  if (mode === "edit" && map) {
    return {
      opcoId: map.opcoId,
      serviceName: map.serviceName,
      partnerId: map.partnerId,
    };
  }
  return {
    opcoId: opcos.find((opco) => opco.status === "ACTIVE")?.id ?? opcos[0]?.id ?? "",
    serviceName: "",
    partnerId: partners[0]?.id ?? "",
  };
}

export function ServicePartnerMapFormModal({
  open,
  mode,
  map,
  partners,
  opcos,
  onClose,
  onSaved,
}: ServicePartnerMapFormModalProps) {
  const [values, setValues] = useState<FormValues>(() =>
    getInitialValues(mode, map, partners, opcos),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(getInitialValues(mode, map, partners, opcos));
      setError(null);
    }
  }, [open, mode, map, partners, opcos]);

  if (!open) {
    return null;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        mode === "create"
          ? "/api/admin/service-partner-maps"
          : `/api/admin/service-partner-maps/${map?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to save mapping"));
      }

      onSaved(
        body.data as ServicePartnerMapListItem,
        mode === "create" ? "Mapping created." : "Mapping updated.",
      );
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save mapping",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activePartners = partners.filter((partner) => partner.status === "ACTIVE");
  const activeOpcos = opcos.filter((opco) => opco.status === "ACTIVE");
  const opcoOptions =
    mode === "edit" && map && !activeOpcos.some((opco) => opco.id === map.opcoId)
      ? [{ id: map.opcoId, name: map.opcoName }, ...activeOpcos]
      : activeOpcos;

  return (
    <PortalOverlay onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-partner-map-form-title"
        className={ui.modal}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="service-partner-map-form-title"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {mode === "create" ? "Create mapping" : "Edit mapping"}
          </h2>
          <ModalCloseButton onClick={onClose} disabled={submitting} />
        </div>

        <form className="mt-4 space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm">
            <FieldLegend required>OpCo</FieldLegend>
            <select
              value={values.opcoId}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, opcoId: event.target.value }))
              }
              className={ui.select}
              required
            >
              {opcoOptions.map((opco) => (
                <option key={opco.id} value={opco.id}>
                  {opco.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <FieldLegend required>Service / Application name</FieldLegend>
            <input
              value={values.serviceName}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, serviceName: event.target.value }))
              }
              className={ui.input}
              required
              maxLength={255}
            />
          </label>

          <label className="block text-sm">
            <FieldLegend required>Partner</FieldLegend>
            <select
              value={values.partnerId}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, partnerId: event.target.value }))
              }
              className={ui.select}
              required
            >
              {activePartners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className={ui.alertError}>{error}</p> : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || activePartners.length === 0 || opcoOptions.length === 0}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </PortalOverlay>
  );
}
