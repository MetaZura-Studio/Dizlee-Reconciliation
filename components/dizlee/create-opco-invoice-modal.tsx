"use client";

import { useEffect, useState } from "react";

import type {
  CreateOpcoInvoiceFormOptions,
  CreateOpcoInvoiceInput,
  CreateOpcoInvoiceLineInput,
} from "@/lib/dizlee/invoices";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const emptyLine = (): CreateOpcoInvoiceLineInput => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

type CreateOpcoInvoiceModalProps = {
  open: boolean;
  defaultMonth: number;
  defaultYear: number;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateOpcoInvoiceModal({
  open,
  defaultMonth,
  defaultYear,
  onClose,
  onCreated,
}: CreateOpcoInvoiceModalProps) {
  const [formOptions, setFormOptions] = useState<CreateOpcoInvoiceFormOptions | null>(
    null,
  );
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [opcoId, setOpcoId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [lineItems, setLineItems] = useState<CreateOpcoInvoiceLineInput[]>([
    emptyLine(),
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void fetch("/api/dizlee/invoices?form=create")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load form options");
        }
        const options = payload.data as CreateOpcoInvoiceFormOptions;
        setFormOptions(options);
        if (options.opcos.length > 0) {
          const first = options.opcos[0];
          setOpcoId(first.id);
          setCurrencyId(first.defaultCurrencyId);
        }
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load form options",
        );
      })
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const handleOpcoChange = (nextOpcoId: string) => {
    setOpcoId(nextOpcoId);
    const opco = formOptions?.opcos.find((row) => row.id === nextOpcoId);
    if (opco) {
      setCurrencyId(opco.defaultCurrencyId);
    }
  };

  const updateLine = (
    index: number,
    field: keyof CreateOpcoInvoiceLineInput,
    value: string,
  ) => {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }
        if (field === "description") {
          return { ...line, description: value };
        }
        return {
          ...line,
          [field]: Number(value),
        };
      }),
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body: CreateOpcoInvoiceInput = {
        month,
        year,
        opcoId,
        currencyId: currencyId || undefined,
        lineItems,
      };
      const response = await fetch("/api/dizlee/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create invoice");
      }
      onCreated();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create invoice",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Create invoice to OpCo
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Digital Dizlee → OpCo invoice for the selected period.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-foreground-subtle hover:text-foreground"
          >
            Close
          </button>
        </div>

        {loadingOptions ? (
          <p className="mt-4 text-sm text-foreground-subtle">Loading form…</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-foreground-subtle">Month</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
                >
                  {MONTHS.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-foreground-subtle">Year</span>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
                >
                  {yearOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-xs text-foreground-subtle">OpCo</span>
                <select
                  value={opcoId}
                  onChange={(event) => handleOpcoChange(event.target.value)}
                  className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
                >
                  {formOptions?.opcos.map((opco) => (
                    <option key={opco.id} value={opco.id}>
                      {opco.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-xs text-foreground-subtle">Currency</span>
                <select
                  value={currencyId}
                  onChange={(event) => setCurrencyId(event.target.value)}
                  className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
                >
                  {formOptions?.currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.isoCode}
                      {currency.symbol ? ` (${currency.symbol})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formOptions?.bankDetails ? (
              <div className="rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
                <p className="font-medium text-foreground">Bank details (from admin)</p>
                <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                  {formOptions.bankDetails.bankName ? (
                    <div>
                      <dt className="text-xs text-foreground-subtle">Bank</dt>
                      <dd>{formOptions.bankDetails.bankName}</dd>
                    </div>
                  ) : null}
                  {formOptions.bankDetails.accountName ? (
                    <div>
                      <dt className="text-xs text-foreground-subtle">Account name</dt>
                      <dd>{formOptions.bankDetails.accountName}</dd>
                    </div>
                  ) : null}
                  {formOptions.bankDetails.accountNumber ? (
                    <div>
                      <dt className="text-xs text-foreground-subtle">Account number</dt>
                      <dd>{formOptions.bankDetails.accountNumber}</dd>
                    </div>
                  ) : null}
                  {formOptions.bankDetails.iban ? (
                    <div>
                      <dt className="text-xs text-foreground-subtle">IBAN</dt>
                      <dd>{formOptions.bankDetails.iban}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : (
              <p className="text-sm text-warning">
                Bank details are not configured in admin settings yet.
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground-muted">Line items</h3>
                <button
                  type="button"
                  onClick={() => setLineItems((current) => [...current, emptyLine()])}
                  className="text-sm text-foreground-muted underline hover:text-foreground"
                >
                  Add line
                </button>
              </div>
              {lineItems.map((line, index) => (
                <div
                  key={`line-${index}`}
                  className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-4"
                >
                  <input
                    value={line.description}
                    onChange={(event) =>
                      updateLine(index, "description", event.target.value)
                    }
                    placeholder="Description"
                    className="rounded-md border border-border-strong px-3 py-1.5 text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(index, "quantity", event.target.value)
                    }
                    placeholder="Qty"
                    className="rounded-md border border-border-strong px-3 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(event) =>
                      updateLine(index, "unitPrice", event.target.value)
                    }
                    placeholder="Unit price"
                    className="rounded-md border border-border-strong px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>

            {error ? (
              <div className="rounded-md border border-danger-border bg-danger-muted p-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border-strong px-4 py-2 text-sm text-foreground-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !opcoId}
                onClick={() => void submit()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create invoice"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
