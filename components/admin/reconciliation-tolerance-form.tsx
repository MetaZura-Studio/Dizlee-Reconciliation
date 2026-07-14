"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ReconciliationToleranceView } from "@/lib/admin/reconciliation-tolerance";
import { ui } from "@/lib/ui/classes";

type ReconciliationToleranceFormProps = {
  initialSettings: ReconciliationToleranceView;
};

function toFormState(settings: ReconciliationToleranceView) {
  return {
    reconciliationNegligiblePercent: String(
      settings.reconciliationNegligiblePercent,
    ),
  };
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function ReconciliationToleranceForm({
  initialSettings,
}: ReconciliationToleranceFormProps) {
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const applySettings = useCallback((settings: ReconciliationToleranceView) => {
    setSavedSettings(settings);
    setForm(toFormState(settings));
  }, []);

  const reloadSettings = async () => {
    setError(null);
    setSuccess(null);
    setReloading(true);

    try {
      const response = await fetch("/api/admin/reconciliation-tolerance");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.error ?? "Failed to reload reconciliation tolerance",
        );
      }
      applySettings(body.data as ReconciliationToleranceView);
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Failed to reload reconciliation tolerance",
      );
    } finally {
      setReloading(false);
    }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const trimmed = form.reconciliationNegligiblePercent.trim();
      if (trimmed === "") {
        throw new Error("Tolerance is required");
      }

      const reconciliationNegligiblePercent = Number.parseFloat(trimmed);
      if (Number.isNaN(reconciliationNegligiblePercent)) {
        throw new Error("Tolerance must be a number");
      }

      const response = await fetch("/api/admin/reconciliation-tolerance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconciliationNegligiblePercent }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.error ?? "Failed to save reconciliation tolerance",
        );
      }

      applySettings(body.data as ReconciliationToleranceView);
      setSuccess("Reconciliation tolerance saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save reconciliation tolerance",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className={ui.alertError}>{error}</p> : null}
      {success ? <p className={ui.alertSuccess}>{success}</p> : null}

      <form onSubmit={(event) => void saveSettings(event)} className="space-y-6">
        <div className="space-y-1">
          <label htmlFor="reconciliationNegligiblePercent" className={ui.label}>
            Negligible difference (%)
          </label>
          <input
            id="reconciliationNegligiblePercent"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={form.reconciliationNegligiblePercent}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reconciliationNegligiblePercent: event.target.value,
              }))
            }
            className={`${ui.input} max-w-xs`}
          />
          <p className={ui.hint}>
            Current saved value:{" "}
            {formatPercent(savedSettings.reconciliationNegligiblePercent)}%
          </p>
        </div>

        <p className={`${ui.cardPadding} text-sm text-foreground-muted`}>
          Lines within this percentage relative difference are treated as
          matched when Dizlee runs reconciliation. Unlinked or larger variances
          remain mismatched.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || reloading}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void reloadSettings()}
            disabled={saving || reloading}
          >
            {reloading ? "Reloading…" : "Reload"}
          </Button>
        </div>
      </form>
    </div>
  );
}
